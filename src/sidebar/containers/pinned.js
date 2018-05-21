class PinnedTabsContainer extends AbstractTabContainer {
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

    render(updateTabs) {
        if (updateTabs) {
            browser.tabs.query({
                currentWindow: true,
                pinned: true
            }).then((res) => {
                this.renderTabs(this.element, res)
            })
        }
    }
}