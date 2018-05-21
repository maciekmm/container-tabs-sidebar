const FAVICON_LOADING = 'chrome://global/skin/icons/loading.png'
const FAVICON_FALLBACK = '../assets/no-favicon.svg'

const ContainerTabsSidebar = {
    containers: new Map(),
    pinnedTabs: new PinnedTabsContainer(document.getElementById('pinned-tabs')),

    // There exists a browser.windows.WINDOW_ID_CURRENT, but it yields some negative value
    // It's impossible to compare with ids some events are providing in callbacks, therefore
    // we get the current window id by browser.windows.getCurrent and set the appropriate property
    init(windowId) {
        this.WINDOW_ID = windowId
    
        // containers
        browser.contextualIdentities.onUpdated.addListener((evt) => {
            const container = this.containers.get(evt.contextualIdentity.cookieStoreId)
            if (container) {
                container.refresh(evt.contextualIdentity)
            }
        })

        ContextMenuManager.init()

        this.refresh()
        //this.showContextMenu(new ContextMenu({}, [{label: 'Test', action: null}]), 10, 10)
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
        const containersList = document.getElementById('containers')
        for (let firefoxContainer of containers) {
            const containerParent = document.createElement('li')
            containerParent.classList.add('container')
            containerParent.id = 'container-tabs-' + firefoxContainer.cookieStoreId

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