import AbstractTabContainer from './container.js'

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

        this.elements.containerHeader.addEventListener('contextmenu', (e) => browser.menus.overrideContext({
            showDefaults: false
        }))
    }

    async _handleDrop(tab, pinned, tabCtxId, index) {
        let tabId = tab.id
        if (this.supportsCookieStore(tabCtxId)) {
            if (pinned) {
                let updated = await browser.tabs.update(tabId, {
                    pinned: false,
                })
                index += updated.index < index ? 0 : 1
            } else {
                index += tab.index < index ? -1 : 0
            }
            browser.tabs.move(tabId, {
                windowId: this._window.id,
                index: index 
            })
        } else {
            let tab = await browser.tabs.get(tabId)
            // moving tabs between containers
            let tabInfo = {
                // pinned: tab.pinned,
                openInReaderMode: tab.isInReaderMode,
                cookieStoreId: this.id,
            }

            if (index !== -1) {
                tabInfo['index'] = index
            }

            // firefox treats about:newtab as privileged url, but not setting the url allows us to create that page
            if (tab.url !== 'about:newtab') {
                tabInfo.url = tab.url
            }
            await this._actionNewTab(tabInfo)
            await browser.tabs.remove(tabId)
        }
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

    async _actionNewTab(options) {
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