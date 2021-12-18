import AbstractTabContainer from "./container.js"

function _createRootElement() {
    return document
        .getElementById("vertical-container-template")
        .content.cloneNode(true)
        .querySelector("li")
}

export default class VerticalContainer extends AbstractTabContainer {
    constructor(id, window, config, sessionStorage) {
        super(id, window, config, _createRootElement())
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
        this.elements.newTab.addEventListener("click", (evt) => {
            evt.stopPropagation()
            this._actionNewTab()
        })
        this.elements.containerHeader.addEventListener("click", () =>
            this.collapsed(!this.collapsed())
        )

        this.elements.containerHeader.addEventListener("contextmenu", (e) =>
            browser.menus.overrideContext({
                showDefaults: false,
            })
        )
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
                index: index,
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
                tabInfo["index"] = index
            }

            // firefox treats about:newtab as privileged url, but not setting the url allows us to create that page
            if (tab.url !== "about:newtab") {
                tabInfo.url = tab.url
            }
            await this._actionNewTab(tabInfo)
            await browser.tabs.remove(tabId)
        }
    }

    async _handleTabActivated(change) {
        if (this.tabs.has(change.tabId)) {
            await this.collapsed(false)
        } else if (!!this._config["collapse_container"]) {
            await this.collapsed(true)
        }
        super._handleTabActivated(change)
    }

    async _handleTabCreated(newTab) {
        if (newTab.windowId !== this._window.id) return
        await this.render(true)
        const renderedTab = this.tabs.get(newTab.id)
        if (renderedTab) {
            if (newTab.active) {
                await this.collapsed(false)
            }
            renderedTab.scrollIntoView()
        }
    }

    _handleTabPinned(tabId, change, tab) {
        if (tab.pinned) {
            this.removeTab(tabId)
        } else {
            this.render(true)
        }
    }

    async _actionNewTab(options) {}

    collapsed(val) {
        if (typeof val === "undefined") {
            return this._sessionStorage["collapsed"]
        }

        if (this._sessionStorage["collapsed"] === val) return
        this._sessionStorage["collapsed"] = val
        return this.render(false)
    }

    async _queryTabs() {
        throw "_queryTabs() not implemented"
    }

    get _faviconURL() {
        return this.contextualIdentity.iconUrl
    }

    get title() {
        throw "get title() not implemented"
    }

    async render(updateTabs) {
        if (updateTabs) {
            let tabs = await this._queryTabs()
            this.renderTabs(this.elements.tabsContainer, tabs)
        }
        await super.render(updateTabs)
        // styling (border according to container config)
        const containerHeader = this.elements.containerHeader

        // favicon
        this.elements.icon.src = this._faviconURL

        // title
        const titleElement = this.elements.title
        titleElement.innerText = this.title

        // tab count
        this.elements.tabCount.innerText = this.tabs.size

        // collapse
        const collapsed = this.collapsed()
        this.elements.collapse.innerText = collapsed ? "▴" : "▾"
        if (collapsed) {
            this.element.classList.add("collapsed")
        } else {
            this.element.classList.remove("collapsed")
        }
    }
}
