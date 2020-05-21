import VerticalContainer from './vertical.js'

export default class ContextualIdentityContainer extends VerticalContainer {
    constructor(window, config, contextualIdentity, sessionStorage) {
        super(window, config, sessionStorage)
        this.contextualIdentity = contextualIdentity
        this.id = contextualIdentity.cookieStoreId
    }

    init() {
        super.init()
    }

    _handleTabCreated(newTab) {
        if (newTab.cookieStoreId !== this.id) return
        super._handleTabCreated(newTab)
    }

    async _actionNewTab(options = {}) {
        await super._actionNewTab(options)
        await browser.tabs.create({
            ...options,
            cookieStoreId: this.id
        })
    }

    refresh(contextualIdentity) {
        this.contextualIdentity = contextualIdentity
        this.render(false)
    }

    async _queryTabs() {
        return await browser.tabs.query({
            currentWindow: true,
            cookieStoreId: this.id,
            pinned: false
        })
    }

    get _faviconURL() {
        return `/assets/contextual-identities/${this.contextualIdentity.icon}.svg#${this.contextualIdentity.color}`;
    }

    get title() {
        return this.contextualIdentity.name
    }

    async render(renderTabs, callback) {
        this.elements.containerHeader.style.borderLeftColor = this.contextualIdentity.colorCode
        super.render(renderTabs, callback)
    }
    
    supportsCookieStore(cookieStoreId) {
        return this.id === cookieStoreId
    }

    async updateContextualIdentity(contextualIdentity) {
        this.contextualIdentity = contextualIdentity
        await this.render(false)
    }
}