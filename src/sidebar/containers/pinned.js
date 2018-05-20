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
                this.renderTabs(res)
            })
        }
    }

    renderTabs(tabs) {
        this.element.innerHTML = ''
        this.tabs.clear()
        for(let firefoxTab of tabs) {
            const container = ContainerTabsSidebar.containers.get(firefoxTab.cookieStoreId)

            const tabElement = document.createElement('li')
            tabElement.className = 'container-tab'
            tabElement.style.borderBottomColor = container.contextualIdentity.colorCode
            tabElement.setAttribute('data-tab-id', firefoxTab.id)
            tabElement.setAttribute('data-ci-id', firefoxTab.cookieStoreId)

            const pinnedTab = new ContainerTab(firefoxTab, tabElement)
            pinnedTab.init()

            this.element.appendChild(tabElement)
            this.tabs.set(firefoxTab.id, pinnedTab)
        }
    }
}