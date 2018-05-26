const FAVICON_LOADING = 'chrome://global/skin/icons/loading.png'
const FAVICON_FALLBACK = '../assets/no-favicon.svg'

const ContainerTabsSidebar = {
    containers: new Map(),
    elements: {},
    pinnedTabs: new PinnedTabsContainer(document.getElementById('pinned-tabs')),

    // There exists a browser.windows.WINDOW_ID_CURRENT, but it yields some negative value
    // It's impossible to compare with ids some events are providing in callbacks, therefore
    // you should get the current window id by browser.windows.getCurrent and provide the value to this function
    init(windowId) {
        this.WINDOW_ID = windowId
    
        // containers
        browser.contextualIdentities.onUpdated.addListener((evt) => {
            const container = this.containers.get(evt.contextualIdentity.cookieStoreId)
            if (container) {
                container.refresh(evt.contextualIdentity)
            }
        })

        browser.contextualIdentities.onRemoved.addListener((evt) => {
            this.removeContextualIdentity(evt.contextualIdentity.cookieStoreId)
        })

        browser.contextualIdentities.onCreated.addListener((evt) => {
            this.addContextualIdentity(evt.contextualIdentity)
        })

        ContextMenuManager.init()

        const containersList = document.getElementById('containers')
        this.elements.containersList = containersList

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


    /**
     * Removes a container from DOM, does not remove it from a browser
     * @param {integer} cookieStoreId - contextual identity id
     */
    removeContextualIdentity(cookieStoreId) {
        if(!this.containers.has(cookieStoreId)) return
        const container = this.containers.get(cookieStoreId)
        this.containers.delete(container)
        container.element.parentNode.removeChild(container.element)
    },

    /**
     * Adds contextual identity to DOM
     * @param {integer}
     */
    addContextualIdentity(contextualIdentity) {
        const ctxId = this.createContainer(contextualIdentity)
        this.elements.containersList.appendChild(ctxId.element)
    },

    render(containers) {
        const containersList = this.elements.containersList
        for (let firefoxContainer of containers) {
            const ctxId = this.createContainer(firefoxContainer)
            containersList.appendChild(ctxId.element)
        }
    },

    createContainer(ctxId) {
        const containerParent = document.createElement('li')
        containerParent.classList.add('container')
        containerParent.id = 'container-tabs-' + ctxId.cookieStoreId

        const container = new ContextualIdentityContainer(ctxId, containerParent)
        container.init(ctxId)
        this.containers.set(ctxId.cookieStoreId, container)
        return container
    },
}

{
    browser.windows.getCurrent().then((window) => {
        ContainerTabsSidebar.init(window.id);
    })
}