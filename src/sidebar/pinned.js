class PinnedContainerTab extends ContainerTab {
    _createElements() {
        this.elements = {}
        this.elements.favicon = document.createElement('img')
        this.elements.favicon.className = 'favicon'
        this.element.appendChild(this.elements.favicon)

        this.element.addEventListener("click", () => {
            browser.tabs.update(this.id, {
                active: true
            })
        })
    }

    render() {
        let faviconUrl = this.tab.favIconUrl
        if(!faviconUrl) {
            faviconUrl = ContainerTabsSidebar.FAVICON_FALLBACK
        }
        this.elements.favicon.src = faviconUrl
        this.element.title = this.tab.title
        if(this.tab.active) {
            this.element.classList.add('tab-active')
        }
    }

    scrollIntoView() {}
}

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

            const pinnedTab = new PinnedContainerTab(firefoxTab, tabElement)
            pinnedTab.init()

            this.element.appendChild(tabElement)
            this.tabs.set(firefoxTab.id, pinnedTab)
        }
    }
}