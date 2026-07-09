const ICON_AUDIBLE = "../assets/audio.svg"
const ICON_MUTED = "../assets/audio-muted.svg"
const FAVICON_LOADING = "../assets/throbber.png"
const FAVICON_FALLBACK = "../assets/no-favicon.svg"
const FAVICON_FALLBACK_CLASS = "favicon-fallback"

function createRootElement() {
    return document
        .getElementById("tab-template")
        .content.cloneNode(true)
        .querySelector("li")
}

export default class ContainerTab {
    constructor(window, container, tab) {
        this.tab = tab
        this.id = tab.id
        this.element = createRootElement()
        this._container = container
        this._window = window
        this._listeners = {}
    }

    init() {
        this._createElements()
        this.render()

        browser.tabs.onUpdated.addListener(
            (this._listeners.update = (id, change, tab) => {
                this.tab = tab
                this.render()
            }),
            {
                tabId: this.id,
                windowId: this._window.id,
                properties: [
                    "title",
                    "favIconUrl",
                    "status",
                    "mutedInfo",
                    "audible",
                ],
            }
        )

        browser.tabs.onHighlighted.addListener((event) => {
            if (event.windowId !== this._window.id) {
                return
            }
            const newHighlighted = event.tabIds.indexOf(this.id) !== -1
            if (newHighlighted !== this.tab.highlighted) {
                this.tab.highlighted = newHighlighted
                this.render()
            }
        })

        this.element.setAttribute("draggable", true)
        this.element.addEventListener("contextmenu", (e) =>
            browser.menus.overrideContext({
                context: "tab",
                tabId: this.id,
            })
        )

        this.element.addEventListener("dragstart", (e) => {
            e.dataTransfer.effectAllowed = "move"
            e.dataTransfer.setData(
                "tab/move",
                this.id + "/" + this.tab.cookieStoreId + "/" + this.tab.pinned
            )
            this.element.classList.add("container-tab-dragged")
            document.body.classList.add("tab-dragged")
        })

        this.element.addEventListener("dragover", (e) => {
            if (!e.dataTransfer.types.includes("tab/move")) {
                return
            }
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = "move"
            this.elements["link"].classList.add("container-tab-dragged-over")
            return false
        })

        this.element.addEventListener("dragleave", (e) => {
            this.elements["link"].classList.remove("container-tab-dragged-over")
        })

        this.element.addEventListener("dragend", (e) => {
            this.elements["link"].classList.remove("container-tab-dragged-over")
            document.body.classList.remove("tab-dragged")
        })
    }

    destroy() {
        browser.tabs.onUpdated.removeListener(this._listeners.update)
    }

    _createElements() {
        this.elements = {
            link: this.element.querySelector(".container-tab"),
            favicon: this.element.querySelector(".favicon"),
            title: this.element.querySelector(".container-tab-title"),
            audible: this.element.querySelector(".container-tab-action--mute"),
            close: this.element.querySelector(".container-tab-close"),
        }
        this.elements["link"].setAttribute("data-tab-id", this.tab.id)
        this.elements["link"].setAttribute("data-ci-id", this.tab.cookieStoreId)

        this.elements.favicon.addEventListener("error", () => {
            this.elements.favicon.src = FAVICON_FALLBACK
            this.elements.favicon.classList.add(FAVICON_FALLBACK_CLASS)
        })

        this.elements.audible.addEventListener("click", (e) => {
            e.stopPropagation()
            e.preventDefault()
            browser.tabs.update(this.id, {
                muted: !(this.tab.mutedInfo && this.tab.mutedInfo.muted),
            })
        })

        this.elements.close.addEventListener(
            "click",
            this._removeCloseClick.bind(this)
        )

        this.element.addEventListener("click", async (e) => {
            // prevent reloading tab
            e.preventDefault()
            e.stopPropagation()
            if (e.button !== 0) return
            if (!!e.ctrlKey && !this.tab.active) {
                const highlighted = await browser.tabs.query({
                    windowId: this._window.id,
                    highlighted: true,
                })
                const tabsToSelect = [...highlighted.map((tab) => tab.index)]
                const currentIndex = await browser.tabs.get(this.id)
                const index = tabsToSelect.indexOf(currentIndex.index)
                if (index === -1) {
                    tabsToSelect.push(currentIndex.index)
                } else {
                    tabsToSelect.splice(index, 1)
                }
                await browser.tabs.highlight({
                    windowId: this._window.id,
                    populate: false,
                    tabs: tabsToSelect,
                })
            } else {
                await browser.tabs.update(this.id, {
                    active: true,
                })
            }
        })

        this.element.addEventListener("auxclick", (e) => {
            if (e.button !== 1) return
            this._removeCloseClick(e)
        })

        if (this.tab.pinned) {
            browser.contextualIdentities
                .get(this.tab.cookieStoreId)
                .then((ci) => {
                    this.elements["link"].style.borderColor = ci.colorCode
                })
        }
    }

    _removeCloseClick(event) {
        event.stopPropagation()
        event.preventDefault()
        browser.tabs.remove(this.id)
    }

    activate() {
        if (this.tab.active) return
        this.tab.active = true
        this.render()
        this.scrollIntoView()
    }

    deactivate() {
        if (!this.tab.active) return
        this.tab.active = false
        this.render()
    }

    /**
     * Scrolls the tab element into view if it's outside
     */
    scrollIntoView() {
        const box = this.element.getBoundingClientRect()
        if (box.top < 0 || box.bottom > window.innerHeight) {
            this.element.scrollIntoView({
                block: "end",
                behavior: "auto",
            })
        }
    }

    render() {
        let favIconUrl = FAVICON_FALLBACK
        if (this.tab.status === "loading") {
            favIconUrl = FAVICON_LOADING
        } else if (this.tab.favIconUrl) {
            favIconUrl = this.tab.favIconUrl
        }
        if (favIconUrl !== this.elements.favicon.src) {
            if (favIconUrl !== FAVICON_FALLBACK) {
                this.elements.favicon.classList.remove(FAVICON_FALLBACK_CLASS)
            } else {
                this.elements.favicon.classList.add(FAVICON_FALLBACK_CLASS)
            }
            this.elements.favicon.src = favIconUrl
        }

        let link = this.elements["link"]

        if (!this.tab.url.startsWith("about:")) {
            link.href = this.tab.url
        }
        this.elements.title.innerText = this.tab.title //+ ` - (${this.tab.index})`
        link.title = this.tab.title

        if (this.tab.active) {
            link.classList.add("tab-active")
        } else {
            link.classList.remove("tab-active")
        }
        if (!!this.tab.highlighted) {
            link.classList.add("tab-highlighted")
        } else {
            link.classList.remove("tab-highlighted")
        }
        if (this.tab.pinned) {
            link.classList.add("tab-pinned")
        } else {
            link.classList.remove("tab-pinned")
        }
        if (this.tab.mutedInfo && this.tab.mutedInfo.muted) {
            this.elements.audible.src = ICON_MUTED
        } else if (this.tab.audible) {
            this.elements.audible.src = ICON_AUDIBLE
        }
        if (
            this.tab.audible ||
            (this.tab.mutedInfo && this.tab.mutedInfo.muted)
        ) {
            this.elements.audible.classList.add("audible")
        } else {
            this.elements.audible.classList.remove("audible")
        }
    }
}
