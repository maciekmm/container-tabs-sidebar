import {
    INTERNAL_MESSAGING_PORT_NAME,
    DEFAULT_COOKIE_STORE_ID
} from '../constants.js'
import {
    getConfig,
    getSessionStorage
} from '../settings.js'
import {
    loadAppearance
} from './theme/appearance.js'
import PinnedTabsContainer from './containers/pinned.js'
import ContextualIdentityContainer from './containers/contextual.js'
import {init as initContainerContextMenu} from './contextmenu/container.js'
import {init as initTabContextMenu} from './contextmenu/tab.js'

export const ContainerTabsSidebar = {
    containers: new Map(),
    elements: {},

    // There exists a browser.windows.WINDOW_ID_CURRENT, but it yields some negative value
    // It's impossible to compare with ids some events are providing in callbacks, therefore
    // you should get the current window id by browser.windows.getCurrent and provide the value to this function
    init(window, config, sessionStorage) {
        this.config = config
        this.sessionStorage = sessionStorage
        this.window = window
        this.pinnedTabs = new PinnedTabsContainer(window, document.getElementById('pinned-tabs')),

        loadAppearance(config)

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


        if(typeof browser.menus.overrideContext == 'function') {
            initContainerContextMenu()
            initTabContextMenu()
        } else {
            ContextMenuManager.init()
        }

        const containersList = document.getElementById('containers')
        this.elements.containersList = containersList

        browser.contextualIdentities.query({}).then((res) => {
            // Incognito does not support containers
            if (window.incognito) {
                res.length = 0
            }
            this.render([{
                cookieStoreId: DEFAULT_COOKIE_STORE_ID,
                name: browser.i18n.getMessage(window.incognito ? 'containerIncognito' : 'containerDefault'),
                iconUrl: 'resource://usercontext-content/briefcase.svg',
                icon: 'briefcase',
                color: 'white',
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

    createContainer(ctx) {
        const containerParent = document.createElement('li')
        containerParent.classList.add('container')
        containerParent.id = 'container-tabs-' + ctx.cookieStoreId
        containerParent.setAttribute('data-container-id', ctx.cookieStoreId)

        if(!this.sessionStorage[ctx.cookieStoreId]) {
            this.sessionStorage[ctx.cookieStoreId] = {}
        }

        const container = new ContextualIdentityContainer(this.window, this.config, ctx, containerParent, this.sessionStorage[ctx.cookieStoreId])
        container.init(ctx)
        this.containers.set(ctx.cookieStoreId, container)
        return container
    },
}

async function init(){
    let window = await browser.windows.getCurrent()
    let config = await getConfig()
    let sessionStorage = await getSessionStorage(window)
    ContainerTabsSidebar.init(window, config, sessionStorage)

    // for tracking sidebar open state
    browser.runtime.connect({name: INTERNAL_MESSAGING_PORT_NAME}).postMessage({
        windowId: window.id,
        opened: true
    })
}

browser.storage.onChanged.addListener(() => {
    window.location.reload()
})

init()
