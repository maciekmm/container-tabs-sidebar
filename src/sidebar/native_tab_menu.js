const SIDEBAR_URL_PATTERN = [`moz-extension://${location.host}/*`]
const DEFAULT_MENU_ITEM_OPTIONS = {
     contexts: ["tab"],
     viewTypes: ["sidebar"],
     documentUrlPatterns: SIDEBAR_URL_PATTERN
}

const optionHandlers = new Map()

function addOption(options, handler) {
     if (!('id' in options)) {
          throw new Error('item options should include id field')
     }
     let item = {
          ...DEFAULT_MENU_ITEM_OPTIONS,
          ...options
     }
     optionHandlers.set(item.id, handler)
     browser.menus.create(item)
}

function addReopenInContainerOption(container) {
     let itemOptions = {
          parentId: "reopen-in-container",
          id: `reopen-in-container:${container.cookieStoreId}`,
          title: `&${container.name}`,
     }
     if(container.icon) {
          itemOptions.icons = {
               "16": container.iconUrl
          }
     }
     addOption(itemOptions, tab => {
          let tabInfo = {
               pinned: tab.pinned,
               openInReaderMode: tab.isInReaderMode,
               cookieStoreId: container.cookieStoreId
          }
          // firefox treats about:newtab as privileged url, but not setting the url allows us to create that page
          if(tab.url !== 'about:newtab') {
               tabInfo.url = tab.url
          }
          browser.tabs.create(tabInfo).then(() => {
               browser.tabs.remove(tab.id)
          })
     })
}

const contextualIdentities = new Set()
async function updateContextualIdentities() {
     contextualIdentities.forEach(i => browser.menus.remove(`reopen-in-container:${i.cookieStoreId}`))
     contextualIdentities.clear()

     let containers = await browser.contextualIdentities.query({})
     for(let container of containers) {
          addReopenInContainerOption(container)
          contextualIdentities.add(container)
     }
}

async function initReopenInContainer() {
     addOption({
          id: "reopen-in-container",
          title: browser.i18n.getMessage("sidebar_menu_reopenInContainer")
     })

     addReopenInContainerOption({
          cookieStoreId: ContainerTabsSidebar.DEFAULT_COOKIE_STORE_ID,
          name: browser.i18n.getMessage("sidebar_menu_reopenInContainer_noContainer")
     })

     browser.contextualIdentities.onRemoved.addListener(updateContextualIdentities)
     browser.contextualIdentities.onCreated.addListener(updateContextualIdentities)
     browser.contextualIdentities.onUpdated.addListener(updateContextualIdentities)
     await updateContextualIdentities()

     browser.menus.create({
          ...DEFAULT_MENU_ITEM_OPTIONS,
          type:'separator',
     })
}

async function init() {
     browser.menus.onClicked.addListener((info, tab) => {
          if (optionHandlers.has(info.menuItemId)) {
               optionHandlers.get(info.menuItemId)(tab)
          }
     })

     addOption({
          id: "reload-tab",
          title: browser.i18n.getMessage("sidebar_menu_reloadTab")
     }, tab => browser.tabs.reload(tab.id))

     addOption({
          id: "mute-tab",
          title: browser.i18n.getMessage("sidebar_menu_muteTab")
     }, tab => browser.tabs.update(tab.id, {
          muted: !(tab.mutedInfo && tab.mutedInfo.muted)
     }))

     addOption({
          id: "pin-tab",
          title: browser.i18n.getMessage("sidebar_menu_pinTab")
     }, tab => browser.tabs.update(tab.id, {
          pinned: !tab.pinned
     }))

     addOption({
          id: "duplicate-tab",
          title: browser.i18n.getMessage("sidebar_menu_duplicateTab")
     }, tab => browser.tabs.duplicate(tab.id))

     browser.menus.create({
          ...DEFAULT_MENU_ITEM_OPTIONS,
          type:'separator',
     })

     await initReopenInContainer()
     
     addOption({
          id: "close-others",
          title: browser.i18n.getMessage("sidebar_menu_closeOtherTabs")
     }, tab => ContainerTabsSidebar.containers.get(tab.cookieStoreId).closeOthers(tab.id))

     addOption({
          id: "close-tab",
          title: browser.i18n.getMessage("sidebar_menu_closeTab")
     }, tab => browser.tabs.remove(tab.id))

     var lastMenuInstanceId = 0;
     var nextMenuInstanceId = 1;
     browser.menus.onShown.addListener(async (info, tab) => {
          var menuInstanceId = nextMenuInstanceId++;
          lastMenuInstanceId = menuInstanceId;

          if (menuInstanceId !== lastMenuInstanceId) {
               return; 
          }

          await browser.menus.update('mute-tab', {
               title: tab.mutedInfo && tab.mutedInfo.muted ? browser.i18n.getMessage("sidebar_menu_unmuteTab") : browser.i18n.getMessage('sidebar_menu_muteTab')
          })

          await browser.menus.update('pin-tab', {
               title: !tab.pinned ? browser.i18n.getMessage("sidebar_menu_pinTab") : browser.i18n.getMessage('sidebar_menu_unpinTab')
          })

          browser.menus.refresh()
     })

     browser.menus.onHidden.addListener(async (info, tab) => {
          await browser.menus.update('')
          lastMenuInstanceId = 0;
     })
}

init()



