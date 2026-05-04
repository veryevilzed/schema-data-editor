import type { Locale } from './types';

export type TranslationKey = string;
export type Translations = Record<TranslationKey, string>;

const ru: Translations = {
  // Common
  'common.cancel': 'Отмена',
  'common.save': 'Сохранить',
  'common.delete': 'Удалить',
  'common.create': 'Создать',
  'common.add': 'Добавить',
  'common.apply': 'Применить',
  'common.close': 'Закрыть',
  'common.edit': 'Редактировать',
  'common.view': 'Просмотр',
  'common.search': 'Поиск…',
  'common.optional': 'опционально',
  'common.yes': 'Да',
  'common.no': 'Нет',
  'common.notSet': 'Не задано',
  'common.any': 'Любое',
  'common.notFound': 'Не найдено',
  'common.dash': '—',
  'common.up': 'Вверх',
  'common.down': 'Вниз',
  'common.reset': 'Сбросить',

  // Theme
  'theme.light': 'Светлая',
  'theme.dark': 'Тёмная',
  'theme.system': 'Система',
  'theme.label': 'Тема',

  // Language
  'language.label': 'Язык',
  'language.ru': 'Русский',
  'language.en': 'English',

  // Welcome
  'welcome.title': 'Schema Data Editor',
  'welcome.subtitle': 'Локальный редактор схемы и данных с настраиваемым хранилищем.',
  'welcome.openProject': 'Открыть проект',
  'welcome.openProjectDesc': 'Выбрать папку с существующим schema.json',
  'welcome.newProject': 'Новый проект',
  'welcome.newProjectDesc': 'Создать пустую схему в выбранной папке',
  'welcome.recent': 'Недавние',
  'welcome.recentEmpty': 'Список пуст.',
  'welcome.dialogOpenTitle': 'Открыть проект',
  'welcome.dialogOpenButton': 'Открыть',
  'welcome.dialogCreateTitle': 'Новый проект — выберите папку',
  'welcome.dialogCreateButton': 'Создать здесь',

  // Topbar
  'topbar.schema': 'Схема',
  'topbar.data': 'Данные',
  'topbar.closeProject': 'Закрыть проект',
  'topbar.close': 'Закрыть',

  // Sidebar
  'sidebar.entities': 'Сущности',
  'sidebar.empty': 'Нажмите +, чтобы создать первую сущность.',
  'sidebar.addEntity': 'Добавить сущность',
  'sidebar.deleteEntity': 'Удалить сущность',
  'sidebar.deleteEntityTitle': 'Удалить сущность «{name}»?',
  'sidebar.deleteEntityDesc': 'Все её данные и связи в других сущностях будут удалены.',

  // Add entity dialog
  'addEntity.title': 'Новая сущность',
  'addEntity.desc': 'Имя в стиле PascalCase, например User, Post, Tag.',
  'addEntity.name': 'Имя',
  'addEntity.namePlaceholder': 'User',
  'addEntity.idStrategy': 'Стратегия ID',
  'addEntity.idStrategyHint':
    'Поменять можно позже, но существующие документы сохранят старые ID.',

  // Project settings
  'project.settings': 'Настройки проекта',
  'project.settingsDesc': 'Хранилище и стратегии ID.',
  'project.storageFormat': 'Формат хранилища',
  'project.storageFormatHint':
    'При смене формата существующие данные будут переписаны.',
  'project.storageSingle': 'Один файл (data.json)',
  'project.storagePerCollection':
    'Файл на коллекцию (User.json, Post.json…)',
  'project.storagePerDoc': 'Файл на документ (User/<id>.json)',
  'project.defaultIdStrategy': 'Стратегия ID по умолчанию',
  'project.defaultIdStrategyHint':
    'Применяется к новым сущностям; у каждой сущности есть свой override.',
  'project.dataDir': 'Папка с данными',
  'project.dataDirHint':
    'Относительно папки проекта. Изменение перенесёт файлы.',

  // ID strategies
  'idStrategy.autoIncrement': 'Auto-increment',
  'idStrategy.autoIncrementLong': 'Auto-increment (число)',
  'idStrategy.uuid': 'UUID v4',
  'idStrategy.uuidLong': 'UUID v4 (строка)',

  // Schema editor
  'schema.notSelectedTitle': 'Сущность не выбрана',
  'schema.notSelectedFirst': 'Создайте первую сущность через + слева.',
  'schema.notSelectedExists':
    'Выберите сущность слева, чтобы редактировать её поля.',

  // Entity editor
  'entity.title': 'Сущность «{name}»',
  'entity.params': 'Параметры самой сущности.',
  'entity.idStrategy': 'Стратегия ID',
  'entity.displayField': 'Поле для отображения',
  'entity.displayFieldHint':
    'Используется в списках и пикерах связей. По умолчанию — id.',
  'entity.displayFieldNoneLabel': '— id —',
  'entity.fields': 'Поля',
  'entity.fieldsEmpty': 'Полей пока нет.',
  'entity.fieldsCount': '{count} полей. Перетаскивание заменено стрелками.',
  'entity.addField': 'Добавить поле',
  'entity.fieldsEmptyHint':
    'Добавьте первое поле, чтобы можно было создавать документы.',

  // Field row
  'field.name': 'Имя',
  'field.type': 'Тип',
  'field.delete': 'Удалить поле',
  'field.required': 'Обязательное',
  'field.unique': 'Уникальное',
  'field.showInList': 'В таблице',
  'field.showInListHint': 'Показывать колонку в таблице на вкладке «Данные»',
  'field.description': 'Описание (опционально)',
  'field.descriptionPlaceholder': 'Что хранится в этом поле',
  'field.default': 'Значение по умолчанию',
  'field.defaultDash': '—',

  // Field types
  'fieldType.string': 'Строка',
  'fieldType.text': 'Текст (длинный)',
  'fieldType.number': 'Число',
  'fieldType.boolean': 'Булево',
  'fieldType.date': 'Дата',
  'fieldType.datetime': 'Дата и время',
  'fieldType.enum': 'Перечисление',
  'fieldType.relation': 'Связь',

  // Enum options
  'enumOpts.values': 'Значения',
  'enumOpts.valuesHint': 'Нажмите Enter, чтобы добавить.',
  'enumOpts.placeholder': 'например, admin',
  'enumOpts.add': 'Добавить',
  'enumOpts.remove': 'Убрать',

  // Relation options
  'relationOpts.target': 'Связь с сущностью',
  'relationOpts.targetEmpty': '— выберите —',
  'relationOpts.targetMissing':
    'Целевая сущность не задана. Откройте редактор схемы.',
  'relationOpts.kind': 'Кардинальность',
  'relationOpts.kindOne': 'Один (один ID)',
  'relationOpts.kindMany': 'Много (массив ID)',

  // Relation defaults
  'relationDefault.targetMissing': 'Сначала выберите целевую сущность.',
  'relationDefault.empty': 'Документов в «{target}» ещё нет.',

  // Date/datetime defaults
  'default.nowDate': 'Текущая дата',
  'default.nowDatetime': 'Текущее время',
  'default.nowDateTooltip': 'Использовать текущую дату при создании документа',
  'default.nowDatetimeTooltip':
    'Использовать текущую дату и время при создании документа',

  // Add field dialog
  'addField.title': 'Новое поле',
  'addField.name': 'Имя поля',
  'addField.namePlaceholder': 'например, name',
  'addField.type': 'Тип',

  // Validation
  'validation.identifier':
    'Имя должно начинаться с буквы или _ и содержать только латиницу, цифры и _',
  'validation.entityExists': 'Сущность с таким именем уже существует',
  'validation.fieldIdReserved': 'Поле "id" зарезервировано',
  'validation.fieldExists': 'Такое поле уже есть',
  'validation.fieldIdentifier':
    'Имя поля должно начинаться с буквы или _ и содержать только латиницу, цифры и _',
  'validation.required': 'Обязательное поле',
  'validation.notNumber': 'Не число',
  'validation.notUnique': 'Значение должно быть уникальным',
  'validation.notInEnum': 'Не одно из допустимых значений',

  // Data view
  'data.search': 'Поиск…',
  'data.filter': 'Фильтр',
  'data.filterTooltip': 'Колоночные фильтры',
  'data.add': 'Добавить',
  'data.docsOne': '{count} документ',
  'data.docsFew': '{count} документа',
  'data.docsMany': '{count} документов',
  'data.shown': '→ показано {count}',
  'data.fieldsHidden':
    'Ни одно поле не отмечено для отображения в таблице. Откройте схему и включите «В таблице» хотя бы у одного поля.',
  'data.emptyTitleNew': 'Здесь пока пусто',
  'data.emptyDescNew': 'Добавьте первый документ в эту сущность.',
  'data.emptyTitleNotFound': 'Ничего не найдено',
  'data.emptyDescNotFound':
    'Снимите фильтры или поменяйте поисковый запрос.',
  'data.entityNoFields': 'У «{name}» нет полей',
  'data.entityNoFieldsDesc': 'Сначала добавьте поля в режиме «Схема».',
  'data.entityNotSelected': 'Сущность не выбрана',
  'data.entityNotSelectedDesc': 'Выберите сущность в боковой панели.',
  'data.noEntitiesTitle': 'В схеме пока нет сущностей',
  'data.noEntitiesDesc':
    'Перейдите в режим «Схема» и добавьте сущность.',
  'data.openSchema': 'Открыть редактор схемы',
  'data.openSchemaShort': 'Открыть схему',
  'data.sortTooltip': 'Сортировать',

  // Filter cells
  'filter.contains': 'содержит…',
  'filter.numberPlaceholder': '>10, <5, 42, 1..100',
  'filter.datePlaceholder': 'напр. 2026-05',

  // Form panel
  'form.titleCreate': 'Новый документ',
  'form.titleEdit': 'Редактирование',
  'form.intro':
    'Заполните поля и сохраните. ID сгенерируется автоматически, если не задан.',
  'form.backToList': 'К списку',
  'form.relationNotSet': '— не выбрано —',
  'form.relationNoDocs': 'В сущности «{target}» ещё нет документов.',

  // Detail panel
  'detail.notFound': 'Документ не найден',
  'detail.entityHash': '{name} #{id}',

  // Confirm dialogs
  'confirm.deleteDocTitle': 'Удалить документ?',
  'confirm.deleteDocDesc': 'ID: {id}. Действие необратимо.',

  // Errors
  'error.noProject': 'Нет открытого проекта',
};

const en: Translations = {
  // Common
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.create': 'Create',
  'common.add': 'Add',
  'common.apply': 'Apply',
  'common.close': 'Close',
  'common.edit': 'Edit',
  'common.view': 'View',
  'common.search': 'Search…',
  'common.optional': 'optional',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.notSet': 'Not set',
  'common.any': 'Any',
  'common.notFound': 'Not found',
  'common.dash': '—',
  'common.up': 'Up',
  'common.down': 'Down',
  'common.reset': 'Reset',

  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',
  'theme.label': 'Theme',

  'language.label': 'Language',
  'language.ru': 'Русский',
  'language.en': 'English',

  'welcome.title': 'Schema Data Editor',
  'welcome.subtitle':
    'Local editor for schema and data with pluggable storage.',
  'welcome.openProject': 'Open project',
  'welcome.openProjectDesc': 'Pick a folder with an existing schema.json',
  'welcome.newProject': 'New project',
  'welcome.newProjectDesc': 'Create an empty schema in the chosen folder',
  'welcome.recent': 'Recent',
  'welcome.recentEmpty': 'Empty list.',
  'welcome.dialogOpenTitle': 'Open project',
  'welcome.dialogOpenButton': 'Open',
  'welcome.dialogCreateTitle': 'New project — pick a folder',
  'welcome.dialogCreateButton': 'Create here',

  'topbar.schema': 'Schema',
  'topbar.data': 'Data',
  'topbar.closeProject': 'Close project',
  'topbar.close': 'Close',

  'sidebar.entities': 'Entities',
  'sidebar.empty': 'Click + to create the first entity.',
  'sidebar.addEntity': 'Add entity',
  'sidebar.deleteEntity': 'Delete entity',
  'sidebar.deleteEntityTitle': 'Delete entity “{name}”?',
  'sidebar.deleteEntityDesc':
    'All its documents and incoming relations will be removed.',

  'addEntity.title': 'New entity',
  'addEntity.desc': 'Use PascalCase, e.g. User, Post, Tag.',
  'addEntity.name': 'Name',
  'addEntity.namePlaceholder': 'User',
  'addEntity.idStrategy': 'ID strategy',
  'addEntity.idStrategyHint':
    'Can be changed later; existing docs keep their IDs.',

  'project.settings': 'Project settings',
  'project.settingsDesc': 'Storage and ID strategies.',
  'project.storageFormat': 'Storage format',
  'project.storageFormatHint':
    'When the format changes, existing data is rewritten.',
  'project.storageSingle': 'Single file (data.json)',
  'project.storagePerCollection':
    'File per collection (User.json, Post.json…)',
  'project.storagePerDoc': 'File per document (User/<id>.json)',
  'project.defaultIdStrategy': 'Default ID strategy',
  'project.defaultIdStrategyHint':
    'Applied to new entities; each entity can override.',
  'project.dataDir': 'Data folder',
  'project.dataDirHint':
    'Relative to the project folder. Changing moves the files.',

  'idStrategy.autoIncrement': 'Auto-increment',
  'idStrategy.autoIncrementLong': 'Auto-increment (number)',
  'idStrategy.uuid': 'UUID v4',
  'idStrategy.uuidLong': 'UUID v4 (string)',

  'schema.notSelectedTitle': 'No entity selected',
  'schema.notSelectedFirst': 'Create the first entity with + on the left.',
  'schema.notSelectedExists':
    'Select an entity on the left to edit its fields.',

  'entity.title': 'Entity “{name}”',
  'entity.params': 'Entity-level settings.',
  'entity.idStrategy': 'ID strategy',
  'entity.displayField': 'Display field',
  'entity.displayFieldHint':
    'Used in lists and relation pickers. Defaults to id.',
  'entity.displayFieldNoneLabel': '— id —',
  'entity.fields': 'Fields',
  'entity.fieldsEmpty': 'No fields yet.',
  'entity.fieldsCount': '{count} fields. Drag-and-drop replaced with arrows.',
  'entity.addField': 'Add field',
  'entity.fieldsEmptyHint':
    'Add the first field so you can create documents.',

  'field.name': 'Name',
  'field.type': 'Type',
  'field.delete': 'Delete field',
  'field.required': 'Required',
  'field.unique': 'Unique',
  'field.showInList': 'In table',
  'field.showInListHint': 'Show this column in the Data tab table',
  'field.description': 'Description (optional)',
  'field.descriptionPlaceholder': 'What this field stores',
  'field.default': 'Default value',
  'field.defaultDash': '—',

  'fieldType.string': 'String',
  'fieldType.text': 'Text (long)',
  'fieldType.number': 'Number',
  'fieldType.boolean': 'Boolean',
  'fieldType.date': 'Date',
  'fieldType.datetime': 'Date & time',
  'fieldType.enum': 'Enum',
  'fieldType.relation': 'Relation',

  'enumOpts.values': 'Values',
  'enumOpts.valuesHint': 'Press Enter to add.',
  'enumOpts.placeholder': 'e.g. admin',
  'enumOpts.add': 'Add',
  'enumOpts.remove': 'Remove',

  'relationOpts.target': 'Relates to',
  'relationOpts.targetEmpty': '— pick one —',
  'relationOpts.targetMissing':
    'Target entity not set. Open the schema editor.',
  'relationOpts.kind': 'Cardinality',
  'relationOpts.kindOne': 'One (single ID)',
  'relationOpts.kindMany': 'Many (array of IDs)',

  'relationDefault.targetMissing': 'Pick the target entity first.',
  'relationDefault.empty': '“{target}” has no documents yet.',

  'default.nowDate': 'Current date',
  'default.nowDatetime': 'Current date & time',
  'default.nowDateTooltip': 'Use the current date when creating a document',
  'default.nowDatetimeTooltip':
    'Use the current date and time when creating a document',

  'addField.title': 'New field',
  'addField.name': 'Field name',
  'addField.namePlaceholder': 'e.g. name',
  'addField.type': 'Type',

  'validation.identifier':
    'Name must start with a letter or _ and contain only Latin letters, digits and _',
  'validation.entityExists': 'An entity with this name already exists',
  'validation.fieldIdReserved': 'Field "id" is reserved',
  'validation.fieldExists': 'This field already exists',
  'validation.fieldIdentifier':
    'Field name must start with a letter or _ and contain only Latin letters, digits and _',
  'validation.required': 'Required',
  'validation.notNumber': 'Not a number',
  'validation.notUnique': 'Value must be unique',
  'validation.notInEnum': 'Not one of the allowed values',

  'data.search': 'Search…',
  'data.filter': 'Filter',
  'data.filterTooltip': 'Per-column filters',
  'data.add': 'Add',
  'data.docsOne': '{count} document',
  'data.docsFew': '{count} documents',
  'data.docsMany': '{count} documents',
  'data.shown': '→ showing {count}',
  'data.fieldsHidden':
    'No field is marked to show in the table. Open the schema and enable "In table" on at least one field.',
  'data.emptyTitleNew': 'Nothing here yet',
  'data.emptyDescNew': 'Add the first document for this entity.',
  'data.emptyTitleNotFound': 'No matches',
  'data.emptyDescNotFound':
    'Clear the filters or change the search query.',
  'data.entityNoFields': '“{name}” has no fields',
  'data.entityNoFieldsDesc': 'Add fields in the Schema tab first.',
  'data.entityNotSelected': 'No entity selected',
  'data.entityNotSelectedDesc': 'Pick an entity in the sidebar.',
  'data.noEntitiesTitle': 'The schema has no entities yet',
  'data.noEntitiesDesc':
    'Switch to Schema mode and add an entity.',
  'data.openSchema': 'Open the schema editor',
  'data.openSchemaShort': 'Open schema',
  'data.sortTooltip': 'Sort',

  'filter.contains': 'contains…',
  'filter.numberPlaceholder': '>10, <5, 42, 1..100',
  'filter.datePlaceholder': 'e.g. 2026-05',

  'form.titleCreate': 'New document',
  'form.titleEdit': 'Edit',
  'form.intro':
    'Fill in the fields and save. The ID is generated automatically if not set.',
  'form.backToList': 'Back to list',
  'form.relationNotSet': '— not selected —',
  'form.relationNoDocs': '“{target}” has no documents yet.',

  'detail.notFound': 'Document not found',
  'detail.entityHash': '{name} #{id}',

  'confirm.deleteDocTitle': 'Delete document?',
  'confirm.deleteDocDesc': 'ID: {id}. This cannot be undone.',

  'error.noProject': 'No project open',
};

export const translations: Record<Locale, Translations> = { ru, en };

export function getPluralForm(locale: Locale, n: number): 'one' | 'few' | 'many' {
  if (locale === 'ru') {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'one';
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'few';
    return 'many';
  }
  return n === 1 ? 'one' : 'many';
}
