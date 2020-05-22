import AbstractTabContainer from './container.js'
import ContextMenuManager from '../context_menu.js'

function _createRootElement() {
    return document.getElementById("vertical-container-template").content.cloneNode(true).querySelector("li")
}

export default class VerticalContainer extends AbstractTabContainer {

    constructor(window, config, sessionStorage) {
        super(window, _createRootElement(), config)
        this._sessionStorage = sessionStorage
    }

    init() {
        this.elements = {
            containerHeader: this.element.querySelector(".container-header"),
            icon: this.element.querySelector(".container-icon"),
            title: this.element.querySelector(".container-title"),
            tabCount: this.element.querySelector(".container-tab-count"),
            actions: this.element.querySelector(".container-actions"),
            newTab: this.element.querySelector(".container-action--newtab"),
            collapse: this.element.querySelector(".container-action--collapse"),
            tabsContainer: this.element.querySelector(".container-tabs"),
        }
        super.init()
        this.elements.newTab.addEventListener('click', (evt) => {
            evt.stopPropagation()
            this._actionNewTab()
        })
        this.elements.containerHeader.addEventListener('click', () => this.collapsed = !this.collapsed)

        this.elements.containerHeader.addEventListener('contextmenu', (e) => {
            if (typeof browser.menus.overrideContext == 'function') {
                browser.menus.overrideContext({
                    showDefaults: false
                })
                return
            }
            e.preventDefault()
            if (ContextMenuManager.contextMenu) {
                ContextMenuManager.hide()
                return
            }

            const contextMenu = new ContextMenu(this)

            contextMenu.addOption('sidebar_menu_reloadAll', () => {
                Array.from(this.tabs.keys()).forEach((tabId) => {
                    browser.tabs.reload(tabId)
                })
            })

            contextMenu.addOption('sidebar_menu_closeAll', () => {
                browser.tabs.remove(Array.from(this.tabs.keys()))
            })

            ContextMenuManager.show(contextMenu, e.clientX, e.clientY)
        })

        this.element.addEventListener('drop', async (e) => {
            e.preventDefault()
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            let [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            tabId = parseInt(tabId);
            pinned = pinned !== 'false'

            if(this.supportsCookieStore(contextualIdentity)) {
                e.currentTarget.classList.remove('container-dragged-over')
                let index = -1
                if (this.tabs.size > 0) {
                    index = this.tabs.values().next().value.tab.index
                }

                //if moved from pinned container
                if (pinned) {
                    browser.tabs.update(tabId, {
                        pinned: false,
                    }).then(() => {
                        browser.tabs.move(tabId, {
                            windowId: this._window.id,
                            index: index // move to the front
                        })
                    })
                } else {
                    browser.tabs.move(tabId, {
                        windowId: this._window.id,
                        index: index // move to the end
                    })
                }
            } else {
                let getDropTab = (target) => {
                    let current = target
                    while(current !== this.element && !current.classList.contains('container-tab')) {
                        current = target.parentElement
                    }
                    return current.getAttribute('data-tab-id')
                }

                let tab = await browser.tabs.get(tabId)
                // moving tabs between containers
                let tabInfo = {
                    // pinned: tab.pinned,
                    openInReaderMode: tab.isInReaderMode,
                    cookieStoreId: this.id
                }

                let dropTabId = getDropTab(e.target)
                if(dropTabId) {
                    let dropTab = await browser.tabs.get(parseInt(dropTabId))
                    tabInfo['index'] = dropTab.index + 1
                }
                // firefox treats about:newtab as privileged url, but not setting the url allows us to create that page
                if (tab.url !== 'about:newtab') {
                    tabInfo.url = tab.url
                }
                await this._actionNewTab(tabInfo)
                browser.tabs.remove(tabId)
                // contextual identity changed
            } 
        })

        this.element.addEventListener('dragover', (e) => {
            e.preventDefault()
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            const [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            if (!this.supportsCookieStore(contextualIdentity)) {
                e.dataTransfer.dropEffect = 'move'
                return
            }
            e.dataTransfer.dropEffect = 'move'
            e.currentTarget.classList.add('container-dragged-over')
            return false
        })
    }

    _handleTabActivated(change) {
        if (this.tabs.has(change.tabId)) {
            this.collapsed = false
        } else if (!!this._config['collapse_container']) {
            this.collapsed = true
        }
        super._handleTabActivated(change)
    }

    _handleTabCreated(newTab) {
        if (newTab.windowId !== this._window.id) return
        this.render(true, () => {
            const renderedTab = this.tabs.get(newTab.id)
            if (renderedTab) {
                renderedTab.scrollIntoView()
            }
        })
        this.collapsed = false
    }

    _handleTabPinned(tabId, change, tab) {
        if (tab.pinned) {
            this.removeTab(tabId)
        } else {
            this.render(true)
        }
    }

    async _actionNewTab() {
    }

    set collapsed(val) {
        if (this._sessionStorage['collapsed'] === val) return
        this._sessionStorage['collapsed'] = val
        this.render(false)
    }

    get collapsed() {
        return this._sessionStorage['collapsed']
    }

    async _queryTabs() {
        throw '_queryTabs() not implemented';
    }

    get _faviconURL() {
        return ``;
    }

    get title() {
        throw 'get title() not implemented';
    }

    async render(updateTabs, callback) {
        if (updateTabs) {
            let tabs = await this._queryTabs()
            this.renderTabs(this.elements.tabsContainer, tabs)
        }
        await super.render(updateTabs)
        // styling (border according to container config)
        const containerHeader = this.elements.containerHeader

        // favicon
        // this.elements.icon.src = this.contextualIdentity.iconUrl
        this.elements.icon.src = this._faviconURL

        // title
        const titleElement = this.elements.title
        titleElement.innerText = this.title

        // tab count
        this.elements.tabCount.innerText = this.tabs.size

        // collapse
        this.elements.collapse.innerText = (this.collapsed ? '▴' : '▾')
        if (this.collapsed) {
            this.element.classList.add('collapsed')
        } else {
            this.element.classList.remove('collapsed')
        }

        if (callback) {
            callback()
        }
    }
}