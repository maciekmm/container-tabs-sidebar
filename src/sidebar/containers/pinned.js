import AbstractTabContainer from "./container.js"

export default class PinnedTabsContainer extends AbstractTabContainer {
    constructor(id, window, config, sessionStore, element) {
        super(id, window, config, element)
    }

    async _handleDrop(tab, pinned, tabCtxId, index) {
        if (!pinned) {
            await browser.tabs.update(tab.id, {
                pinned: true,
            })
        }
        browser.tabs.move(tab.id, {
            windowId: this._window.id,
            index: index,
        })
    }

    _handleTabCreated(newTab) {
        if (!newTab.pinned) return
        super._handleTabCreated(newTab)
    }

    _handleTabPinned(tabId, change, tab) {
        this.render(true)
    }

    async render(updateTabs) {
        await super.render(updateTabs)
        if (updateTabs) {
            let tabs = await browser.tabs.query({
                currentWindow: true,
                pinned: true,
            })
            this.renderTabs(this.element, tabs)
            await this.render(false)
        }
    }

    supportsCookieStore(cookieStoreId) {
        return true
    }
}
