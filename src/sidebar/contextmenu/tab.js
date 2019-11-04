import {
     addOption,
     DEFAULT_MENU_ITEM_OPTIONS
} from './base.js'
import {
     DEFAULT_COOKIE_STORE_ID
} from '../../constants.js'

function addTabOption(options, clickHandler, openHandler) {
     addOption({
          contexts: ["tab"],
          ...options
     }, (info, tab) => clickHandler(tab), openHandler)
}

function addReopenInContainerOption(container) {
     let itemOptions = {
          parentId: "reopen-in-container",
          id: `reopen-in-container:${container.cookieStoreId}`,
          title: `&${container.name}`,
     }
     if (container.icon) {
          itemOptions.icons = {
               "16": `/assets/contextual-identities/${container.icon}.svg#${container.color}`
          }
     }
     addTabOption(itemOptions, tab => {
          let tabInfo = {
               pinned: tab.pinned,
               openInReaderMode: tab.isInReaderMode,
               cookieStoreId: container.cookieStoreId
          }
          // firefox treats about:newtab as privileged url, but not setting the url allows us to create that page
          if (tab.url !== 'about:newtab') {
               tabInfo.url = tab.url
          }
          browser.tabs.create(tabInfo).then(() => {
               browser.tabs.remove(tab.id)
          })
     }, (info, tab) => {
          return {
               visible: container.cookieStoreId != tab.cookieStoreId
          }
     })
}

const contextualIdentities = new Set()
async function updateContextualIdentities() {
     contextualIdentities.forEach(i => browser.menus.remove(`reopen-in-container:${i.cookieStoreId}`))
     contextualIdentities.clear()

     let containers = await browser.contextualIdentities.query({})

     containers.unshift({
          cookieStoreId: DEFAULT_COOKIE_STORE_ID,
          icon: 'briefcase',
          color: 'white',
          name: browser.i18n.getMessage("sidebar_menu_reopenInContainer_noContainer")
     })

     for (let container of containers) {
          addReopenInContainerOption(container)
          contextualIdentities.add(container)
     }
}

async function initReopenInContainer() {
     addTabOption({
          id: "reopen-in-container",
          title: browser.i18n.getMessage("sidebar_menu_reopenInContainer")
     })

     browser.contextualIdentities.onRemoved.addListener(updateContextualIdentities)
     browser.contextualIdentities.onCreated.addListener(updateContextualIdentities)
     browser.contextualIdentities.onUpdated.addListener(updateContextualIdentities)
     await updateContextualIdentities()

     browser.menus.create({
          ...DEFAULT_MENU_ITEM_OPTIONS,
          type: 'separator',
     })
}

export async function init() {

     addTabOption({
          id: "reload-tab",
          title: browser.i18n.getMessage("sidebar_menu_reloadTab")
     }, tab => browser.tabs.reload(tab.id))

     addTabOption({
          id: "mute-tab",
          title: browser.i18n.getMessage("sidebar_menu_muteTab")
     }, tab => browser.tabs.update(tab.id, {
          muted: !(tab.mutedInfo && tab.mutedInfo.muted)
     }), (info, tab) => {
          return {
               title: tab.mutedInfo && tab.mutedInfo.muted ? browser.i18n.getMessage("sidebar_menu_unmuteTab") : browser.i18n.getMessage('sidebar_menu_muteTab')
          }
     })

     addTabOption({
          id: "pin-tab",
          title: browser.i18n.getMessage("sidebar_menu_pinTab")
     }, tab => browser.tabs.update(tab.id, {
          pinned: !tab.pinned
     }), (info, tab) => {
          return {
               title: !tab.pinned ? browser.i18n.getMessage("sidebar_menu_pinTab") : browser.i18n.getMessage('sidebar_menu_unpinTab')
          }
     })

     addTabOption({
          id: "duplicate-tab",
          title: browser.i18n.getMessage("sidebar_menu_duplicateTab")
     }, tab => browser.tabs.duplicate(tab.id))

     browser.menus.create({
          ...DEFAULT_MENU_ITEM_OPTIONS,
          type: 'separator',
     })

     await initReopenInContainer()

     addTabOption({
          id: 'move-to-new-window',
          title: browser.i18n.getMessage("sidebar_menu_moveTabToNewWindow")
     }, tab => browser.windows.create({
          tabId: tab.id
     }))

     addTabOption({
          id: "close-tabs-above",
          title: browser.i18n.getMessage("sidebar_menu_closeTabsAbove")
     }, async tab => {
          let tabs = (await browser.tabs.query({
               cookieStoreId: tab.cookieStoreId,
               windowId: tab.windowId,
               pinned: false
          })).filter(t => t.index < tab.index)
          await browser.tabs.remove(tabs.map(t => t.id))
     }, async (info, tab) => {
          let tabs = (await browser.tabs.query({
               cookieStoreId: tab.cookieStoreId,
               windowId: tab.windowId,
               pinned: false
          })).filter(t => t.index < tab.index)
          return {
               enabled: tabs.length > 0,
               visible: !tab.pinned
          }
     })

     addTabOption({
          id: "close-tabs-below",
          title: browser.i18n.getMessage("sidebar_menu_closeTabsBelow")
     }, async tab => {
          let tabs = (await browser.tabs.query({
               cookieStoreId: tab.cookieStoreId,
               windowId: tab.windowId,
               pinned: false
          })).filter(t => t.index > tab.index)
          await browser.tabs.remove(tabs.map(t => t.id))
     }, async (info, tab) => {
          let tabs = (await browser.tabs.query({
               cookieStoreId: tab.cookieStoreId,
               windowId: tab.windowId,
               pinned: false
          })).filter(t => t.index > tab.index)
          return {
               enabled: tabs.length > 0,
               visible: !tab.pinned
          }
     })

     addTabOption({
          id: "close-others",
          title: browser.i18n.getMessage("sidebar_menu_closeOtherTabs")
     }, async tab => {
          let tabs = await browser.tabs.query({
               cookieStoreId: tab.cookieStoreId,
               windowId: tab.windowId,
               pinned: false
          })
          browser.tabs.remove(Array.from(tabs.map(t => t.id)).filter(key => key != tab.id))
     },
          async (info, tab) => {
               let tabs = await browser.tabs.query({
                    cookieStoreId: tab.cookieStoreId,
                    windowId: tab.windowId,
                    pinned: false
               })
               return {
                    enabled: tabs.length > 1,
                    visible: !tab.pinned
               }
          })

     addTabOption({
          id: 'undo-closed-tab',
          title: browser.i18n.getMessage("sidebar_menu_undoClosedTab"),
     }, async () => {
          let sessions = await browser.sessions.getRecentlyClosed({
               maxResults: 1
          })
          if (!sessions.length) return;
          let sessionInfo = sessions[0]
          if (sessionInfo.tab) {
               browser.sessions.restore(sessionInfo.tab.sessionId)
          }
     }, async () => {
          let sessions = await browser.sessions.getRecentlyClosed({
               maxResults: 1
          })
          return {
               enabled: !!sessions.length && !!sessions[0].tab
          }
     })

     addTabOption({
          id: "close-tab",
          title: browser.i18n.getMessage("sidebar_menu_closeTab")
     }, tab => browser.tabs.remove(tab.id))
}