const ContainerTabsSidebar = {
    FAVICON_FALLBACK: '../assets/no-favicon.svg',
    containers: new Map(),
    pinnedTabs: new PinnedTabsContainer(document.getElementById("pinned-tabs")),

    init(windowId) {
        this.WINDOW_ID = windowId
    
        browser.contextualIdentities.onUpdated.addListener((evt) => {
            const container = this.containers.get(evt.contextualIdentity.cookieStoreId)
            if (container) {
                container.refresh(evt.contextualIdentity)
            }
        })

        browser.tabs.onActivated.addListener((activeInfo) => {
            if(activeInfo.windowId != this.WINDOW_ID) {
                return
            }

            // This is a bit hacky, TODO: clean this up
            for(let tab of document.getElementsByClassName('tab-active')) {
                if(tab.getAttribute("data-tab-id") != activeInfo.tabId) {
                    tab.classList.remove('tab-active')
                }
            };
        });
        this.refresh()
    },

    refresh() {
        browser.contextualIdentities.query({}).then((res) => {
            this.render([{
                cookieStoreId: 'firefox-default',
                name: 'Default',
                iconUrl: 'resource://usercontext-content/briefcase.svg',
                colorCode: '#ffffff'
            }, ...res]);
            this.pinnedTabs.init()
        })
    },

    render(containers) {
        const containersList = document.getElementById("containers")
        for (let firefoxContainer of containers) {
            const containerParent = document.createElement('li')
            containerParent.classList.add("container")
            containerParent.id = "container-tabs-" + firefoxContainer.cookieStoreId

            const container = new ContextualIdentityContainer(firefoxContainer, containerParent);
            container.init(firefoxContainer)
            containersList.appendChild(containerParent)
            this.containers.set(firefoxContainer.cookieStoreId, container)
        }
    },
}

{
    browser.windows.getCurrent().then((window) => {
        ContainerTabsSidebar.init(window.id);
    })
}