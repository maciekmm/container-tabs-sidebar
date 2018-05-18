const ContainerTabsSidebar = {
    containers: new Map(),

    init() {
        browser.contextualIdentities.onUpdated.addListener((evt) => {
            const container = this.containers.get(evt.contextualIdentity.cookieStoreId)
            if (container) {
                container.refresh(evt.contextualIdentity)
            }
        })

        browser.tabs.onActivated.addListener((activeInfo) => {
            if(activeInfo.windowId != browser.windows.WINDOW_ID_CURRENT) {
                //TODO Why doesn't it match ???
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
            console.log(res)
            this.render([{
                cookieStoreId: 'firefox-default',
                name: 'Default',
                iconUrl: 'resource://usercontext-content/briefcase.svg'
            }, ...res]);
        })
    },

    render(containers) {
        const containersList = document.getElementById("containers")
        for (let firefoxContainer of containers) {
            const containerParent = document.createElement('li')
            containerParent.classList.add("container")
            containerParent.id = "container-tabs-" + firefoxContainer.cookieStoreId

            const container = new Container(firefoxContainer, containerParent);
            container.init(firefoxContainer)
            containersList.appendChild(containerParent)
            this.containers.set(firefoxContainer.cookieStoreId, container)
        }
    },
}


{
    ContainerTabsSidebar.init();
}