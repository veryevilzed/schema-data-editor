import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  readAllData,
  readSchema,
  saveDocument,
  deleteDocument,
  deleteAttachment,
  migrateSchemaChange,
  readAttachment,
  writeAttachment,
  writeSchema,
} from '../src/main/storage.ts';
import { emptySchema, emptyEntity } from '../src/shared/schema.ts';

async function main(): Promise<void> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sde-smoke-'));
  console.log('tmp:', tmp);

  // 1. Create schema with two entities
  const schema = emptySchema();
  schema.entities.User = emptyEntity('User', 'auto-increment');
  schema.entities.User.fields.name = { type: 'string', required: true };
  schema.entities.User.fields.role = { type: 'enum', values: ['admin', 'user'] };
  schema.entities.User.fieldOrder = ['name', 'role'];
  schema.entities.Post = emptyEntity('Post', 'uuid');
  schema.entities.Post.fields.title = { type: 'string' };
  schema.entities.Post.fields.author = { type: 'relation', target: 'User', kind: 'one' };
  schema.entities.Post.fieldOrder = ['title', 'author'];
  schema.entityOrder = ['User', 'Post'];

  await writeSchema(tmp, schema);
  await migrateSchemaChange(tmp, emptySchema(), schema);

  // 2. Save docs
  await saveDocument(tmp, schema, 'User', { id: 1, name: 'Alice', role: 'admin' });
  await saveDocument(tmp, schema, 'User', { id: 2, name: 'Bob', role: 'user' });
  await saveDocument(tmp, schema, 'Post', { id: 'p-1', title: 'Hello', author: 1 });
  await saveDocument(tmp, schema, 'Post', { id: 'p-2', title: 'World', author: 2 });

  // 3. Read back
  let data = await readAllData(tmp, schema);
  console.log('after single-json save:');
  console.log('  Users:', data.User.length, 'first:', data.User[0]);
  console.log('  Posts:', data.Post.length);
  if (data.User.length !== 2 || data.Post.length !== 2) {
    throw new Error('lost docs in single-json mode');
  }

  // 4. Migrate to file-per-collection
  const prevSchema = JSON.parse(JSON.stringify(schema));
  schema.storage.format = 'file-per-collection';
  await writeSchema(tmp, schema);
  await migrateSchemaChange(tmp, prevSchema, schema);

  data = await readAllData(tmp, schema);
  console.log('after migrate to file-per-collection:');
  console.log('  Users:', data.User.length);
  console.log('  Posts:', data.Post.length);
  if (data.User.length !== 2 || data.Post.length !== 2) {
    throw new Error('lost docs after migrate to file-per-collection');
  }

  const filesAfterMigrate = await fs.readdir(path.join(tmp, 'data'));
  console.log('  data dir:', filesAfterMigrate);

  // 5. Migrate to file-per-doc
  const prev2 = JSON.parse(JSON.stringify(schema));
  schema.storage.format = 'file-per-doc';
  await writeSchema(tmp, schema);
  await migrateSchemaChange(tmp, prev2, schema);

  data = await readAllData(tmp, schema);
  console.log('after migrate to file-per-doc:');
  console.log('  Users:', data.User.length);
  console.log('  Posts:', data.Post.length);
  if (data.User.length !== 2 || data.Post.length !== 2) {
    throw new Error('lost docs after migrate to file-per-doc');
  }

  const userFiles = await fs.readdir(path.join(tmp, 'data', 'User'));
  console.log('  User files:', userFiles);

  // 6. Update + delete
  await saveDocument(tmp, schema, 'User', { id: 1, name: 'Alice2', role: 'admin' });
  await deleteDocument(tmp, schema, 'User', 2);

  data = await readAllData(tmp, schema);
  console.log('after update+delete:');
  console.log('  Users:', data.User);
  if (data.User.length !== 1 || data.User[0].name !== 'Alice2') {
    throw new Error('update/delete failed');
  }

  // 7. Roundtrip schema read
  const reread = await readSchema(tmp);
  if (!reread || reread.entityOrder.length !== 2) {
    throw new Error('schema reread failed');
  }
  console.log('schema reread OK, entities:', reread.entityOrder);

  // 8. Attachments roundtrip
  const png1x1 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  const written = await writeAttachment(
    tmp,
    schema,
    'User',
    1,
    'avatar',
    png1x1,
    'tiny.png',
  );
  console.log('attachment written:', written);
  const readBack = await readAttachment(tmp, schema, written.relPath);
  if (readBack !== png1x1) throw new Error('attachment roundtrip mismatch');
  await deleteAttachment(tmp, schema, written.relPath);
  const stillThere = await fs
    .stat(path.join(tmp, schema.storage.dataDir, written.relPath))
    .then(() => true, () => false);
  if (stillThere) throw new Error('attachment was not deleted');
  console.log('attachment delete OK');

  // 9. Migration of dataDir preserves _attachments
  const writtenAgain = await writeAttachment(
    tmp,
    schema,
    'User',
    1,
    'avatar',
    png1x1,
    'tiny.png',
  );
  const prevForMove = JSON.parse(JSON.stringify(schema));
  schema.storage.dataDir = 'data2';
  await writeSchema(tmp, schema);
  await migrateSchemaChange(tmp, prevForMove, schema);
  const movedPath = path.join(tmp, 'data2', writtenAgain.relPath);
  const exists = await fs.stat(movedPath).then(() => true, () => false);
  if (!exists) throw new Error('attachment was not moved with dataDir');
  console.log('dataDir migration preserves _attachments OK');

  // 10. Cleanup
  await fs.rm(tmp, { recursive: true, force: true });
  console.log('\n✅ smoke storage test passed');
}

main().catch((e) => {
  console.error('❌ smoke test failed:', e);
  process.exit(1);
});
