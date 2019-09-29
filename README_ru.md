- [Английский](./README.md)
- Русский

# Container Tabs Sidebar

Расширение для FireFox, позволяющее сгруппировать открытые в браузере вкладки в боковой панели для быстрого и конфортного доступа к ним.

![Promotional screenshot](./assets/screenshot.png)

## Требования.

Стабильная работа гарантируется на версиях >=59 firefox. Возможна работоспособность с >=54, но тестов не проводилось. 
Вы можете найти последнюю версию браузера на [firefox.com](https://www.mozilla.org/en-US/firefox/new/)

### Установить из [оффициального репозитория Mozilla](https://addons.mozilla.org/)

1. Посетите [страницу расширения в магазине расширений Firefox](https://addons.mozilla.org/en-US/firefox/addon/container-tabs-sidebar/?src=github)
2. Установите расширение.

### Ручная установка расширения для отладки:
Вы можете вручную установить расширение следующими способами:

#### Через npm:
1. Если на вашем устройстве пристутствует npm (пакетный менеджер для node.js),
в корневой директории расширения выполните команду `npm run dev`, откроется окно браузера.

#### В качестве временного расширения:
1. Склонируйте данный репозиторий или скачайте его содержимое в `.zip` архиве.
2. Откройте `about:debugging`.
3. Нажмите "установить временное расширение".
4. Инициализируйте файл Manifest.json из каталога `/src/`

### Как использовать
Боковая панель FireFox открывается нажатием клавиши F12. При возникновении проблем, 
вызовите через обычную панель закладок ctrl+b --> Закладки.

Реализация кнопки вызова меню расширения планируется в слудующих версиях.

## Модификации внешнего вида.

Создание файла "userChrome.css" в директории `C:\Users\<ваше имя пользователя>\AppData\Roaming\Mozilla\Firefox\Profiles\`
позволяет изменять внешний вид тех или иных элементов интерфейса fireFox.

Примеры заданных правил для стилей приведены ниже.

**Примечание**: начиная с fireFox 69  использование пользовательских стилей возможно только с уcтановленным флагом toolkit.legacyUserProfileCustomizations.stylesheets в about:config

### Скрытие заголовка боковой панели

```css
@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");

#sidebar-box[sidebarcommand^="containertabs"] #sidebar-header {
	display: none;
}
```

Обратите внимание, файл модет содержать только директиву namespace.

|До|После|
|----|---|
|![Before hiding](./assets/before-header.png) | ![After hiding](./assets/after-header.png)

### Скрытие панели вкладок.

```css
@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");

#main-window:not([tabsintitlebar="true"]) #TabsToolbar {
    visibility: collapse !important;
}
```

Обратите внимание, файл модет содержать только одну директиву namespace.