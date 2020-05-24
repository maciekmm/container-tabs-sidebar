import AbstractTabContainer from './container.js'

export default class PinnedTabsContainer extends AbstractTabContainer {

    async _handleDrop(tabId, pinned, tabCtxId, index) {
        if (!pinned) {
            await browser.tabs.update(tabId, {
                pinned: true,
            })
        }
        browser.tabs.move(tabId, {
            windowId: this._window.id,
            index: index
        })
    }

    _handleTabCreated(newTab) {
        if(!newTab.pinned) return
        super._handleTabCreated(newTab)
    }

    _handleTabPinned(tabId, change, tab) {
        if(!tab.pinned) {
            this.removeTab(tabId)
        } else {
            this.render(true)
        }
    }

    async render(updateTabs) {
        super.render(updateTabs)
        if (updateTabs) {
            let tabs = await browser.tabs.query({
                currentWindow: true,
                pinned: true
            })
            this.renderTabs(this.element, tabs)
            this.render(false)
        }
    }

    supportsCookieStore(cookieStoreId) {
        return true
    }
}