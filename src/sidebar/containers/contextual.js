import VerticalContainer from "./vertical.js"
import {
    CONTAINER_MOVED_EVENT,
    IS_CONTAINER_MOVING_ENABLED,
} from "../interop/container_moving.js"

export default class ContextualIdentityContainer extends VerticalContainer {
    constructor(id, window, config, sessionStorage, contextualIdentity) {
        super(id, window, config, sessionStorage)
        this.contextualIdentity = contextualIdentity
    }

    init() {
        super.init()

        if (IS_CONTAINER_MOVING_ENABLED) {
            this._initContainerMoving()
        }
    }

    _initContainerMoving() {
        // the default container is always the first one and cannot be dragged/moved
        const isDraggable =
            this.id !== "firefox-default" && this.id !== "firefox-private"

        if (isDraggable) {
            this.element.setAttribute("draggable", true)

            this.element.addEventListener("dragstart", (e) => {
                e.dataTransfer.effectAllowed = "move"
                e.dataTransfer.setData("container/move", this.id)
                this.element.classList.add("container-dragged")
            })
        }

        this.element.addEventListener("dragover", (e) => {
            if (!e.dataTransfer.types.includes("container/move")) {
                return
            }
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = "move"
            this.element.classList.add("container-identity-dragged-over")
            return false
        })

        this.element.addEventListener("drop", async (e) => {
            if (!e.dataTransfer.types.includes("container/move")) {
                return false
            }
            e.preventDefault()
            e.stopImmediatePropagation()
            this.element.classList.remove("container-identity-dragged-over")
            let [movedCookieStoreId] = e.dataTransfer
                .getData("container/move")
                .split("/")

            let identities = await browser.contextualIdentities.query({})
            let targetIndex = identities.findIndex(
                (cookieStore) => cookieStore.cookieStoreId === this.id
            )

            let previousIndex = identities.findIndex(
                (cookieStore) =>
                    cookieStore.cookieStoreId === movedCookieStoreId
            )

            if (previousIndex > targetIndex) {
                targetIndex++
            }

            if (previousIndex === targetIndex) {
                return false
            }

            await browser.contextualIdentities.move(
                movedCookieStoreId,
                targetIndex
            )

            // contextualIdentities move unfortunately does not fire any event, we need to fire one ourselves
            const event = new CustomEvent(CONTAINER_MOVED_EVENT, {
                bubbles: true,
                detail: {
                    contextualIdentity: movedCookieStoreId,
                    after: this.id,
                },
            })
            this.element.dispatchEvent(event)
            return true
        })

        this.element.addEventListener("dragleave", (e) => {
            this.element.classList.remove("container-identity-dragged-over")
        })

        this.element.addEventListener("dragend", (e) => {
            this.element.classList.remove("container-identity-dragged-over")
            document.body.classList.remove("container-dragged")
        })
    }

    _handleTabCreated(newTab) {
        if (newTab.cookieStoreId !== this.id) return
        super._handleTabCreated(newTab)
    }

    async _actionNewTab(options = {}) {
        await super._actionNewTab(options)
        await browser.tabs.create({
            ...options,
            cookieStoreId: this.id,
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
            pinned: false,
        })
    }

    get title() {
        return this.contextualIdentity.name
    }

    get _faviconURL() {
        return `/assets/contextual-identities/${this.contextualIdentity.icon}.svg#${this.contextualIdentity.color}`
    }

    async render(renderTabs) {
        this.elements.containerHeader.style.borderLeftColor =
            this.contextualIdentity.colorCode
        this.elements.icon.style.fill = this.contextualIdentity.colorCode
        return await super.render(renderTabs)
    }

    supportsCookieStore(cookieStoreId) {
        return this.id === cookieStoreId
    }

    async updateContextualIdentity(contextualIdentity) {
        this.contextualIdentity = contextualIdentity
        await this.render(false)
    }
}
