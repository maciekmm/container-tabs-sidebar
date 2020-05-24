import ContextMenuManager from '../context_menu.js'
const ICON_AUDIBLE = 'chrome://global/skin/media/audioUnmutedButton.svg'
const ICON_MUTED = 'chrome://global/skin/media/audioMutedButton.svg'
const FAVICON_LOADING = 'chrome://global/skin/icons/loading.png'
const FAVICON_FALLBACK = '../assets/no-favicon.svg'
const FAVICON_FALLBACK_CLASS = 'favicon-fallback'

function createRootElement() {
    return document.getElementById("tab-template").content.cloneNode(true).querySelector("li")
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

        browser.tabs.onUpdated.addListener(this._listeners.update = (id, change, tab) => {
            this.tab = tab
            this.render()
        }, {
            tabId: this.id,
            windowId: this._window.id,
            properties: ["title", "favIconUrl", "status", "mutedInfo", "audible"]
        })

        this.element.setAttribute('draggable', true)
        this.element.addEventListener('contextmenu', (e) => {
            if (typeof browser.menus.overrideContext == 'function') {
                browser.menus.overrideContext({
                    context: 'tab',
                    tabId: this.id
                })
                return
            }
            e.preventDefault()
            {
                if (ContextMenuManager.contextMenu) {
                    ContextMenuManager.hide()
                    return
                }

                const contextMenu = new ContextMenu(this)

                contextMenu.addOption('sidebar_menu_reloadTab', () => {
                    browser.tabs.reload(this.id)
                })

                contextMenu.addOption((this.tab.mutedInfo && this.tab.mutedInfo.muted) ? 'sidebar_menu_unmuteTab' : 'sidebar_menu_muteTab', () => {
                    browser.tabs.update(this.id, {
                        muted: !(this.tab.mutedInfo && this.tab.mutedInfo.muted)
                    })
                })

                contextMenu.addOption(this.tab.pinned ? 'sidebar_menu_unpinTab' : 'sidebar_menu_pinTab', () => {
                    browser.tabs.update(this.id, {
                        pinned: !this.tab.pinned
                    })
                })

                contextMenu.addOption('sidebar_menu_duplicateTab', () => {
                    browser.tabs.duplicate(this.id)
                })

                contextMenu.addOption('sidebar_menu_moveTabToNewWindow', () => {
                    browser.windows.create({
                        tabId: this.id
                    })
                })

                contextMenu.addOption('sidebar_menu_closeOtherTabs', () => {
                    this._container.closeOthers(this.id)
                })

                contextMenu.addOption('sidebar_menu_closeTab', () => {
                    browser.tabs.remove(this.id)
                })

                ContextMenuManager.show(contextMenu, e.clientX, e.clientY)
            }
        })

        this.element.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('tab/move', this.id + '/' + this.tab.cookieStoreId + '/' + this.tab.pinned);
            this.element.classList.add('container-tab-dragged');
            document.body.classList.add('tab-dragged')
        })

        this.element.addEventListener('dragover', (e) => {
            e.preventDefault()
            const [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            // if ((this.tab.cookieStoreId != contextualIdentity && !this.tab.pinned) || !e.currentTarget.hasAttribute("data-tab-id")) {
            //     e.dataTransfer.dropEffect = 'none'
            //     return
            // }
            e.stopPropagation()
            e.dataTransfer.dropEffect = 'move'
            e.currentTarget.classList.add('container-tab-dragged-over')
            return false
        })

        this.element.addEventListener('dragleave', (e) => {
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            if (!e.target || !e.target.classList) return
            e.target.classList.remove('container-tab-dragged-over')
        })

        this.element.addEventListener('dragend', (e) => {
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            e.target.classList.remove('container-tab-dragged-over')
            document.body.classList.remove('tab-dragged')
        })

        this.element.addEventListener('drop', async (e) => {
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            let [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            tabId = parseInt(tabId);
            pinned = pinned != 'false'

            //                                                  allow moving anything to pinned container
            if (this.tab.cookieStoreId === contextualIdentity) {
                e.stopPropagation()
                // return
            }

            e.target.classList.remove('container-tab-dragged-over')

            let tab = await browser.tabs.get(tabId)
            // if we move tab upwards the tab will be placed before, if we move it after it will be placed correctly,
            // we need to compensate for that
            let compensation = tab.index > this.tab.index ? 1 : 0;
            //   moving from pinned to not  || moving from not pinned to pinned
            if ((!this.tab.pinned && pinned) || (this.tab.pinned && !pinned)) {
                // we need to update the pinned flag as we are moving tabs between pinned and standard containers
                browser.tabs.update(tabId, {
                    pinned: !pinned
                }).then((tab) => {
                    browser.tabs.get(this.tab.id).then((droppedOn) => { // as we pin a tab indexes get shifted by one, thus we need to get new index
                        if (tab.index == this.tab.index + 1) return
                        browser.tabs.move(tabId, {
                            windowId: this._window.id,
                            index: droppedOn.index + compensation
                        })
                    })
                })
            } else {
                // just reorder tabs as the pinned status does not change (action within container)
                await browser.tabs.move(tabId, {
                    windowId: this._window.id,
                    index: this.tab.index + compensation
                })
            }
        })

    }

    destroy() {
        browser.tabs.onUpdated.removeListener(this._listeners.update)
    }

    _createElements() {
        this.elements = {
            'link': this.element.querySelector(".container-tab"),
            'favicon': this.element.querySelector('.favicon'),
            'title': this.element.querySelector('.container-tab-title'),
            'audible': this.element.querySelector('.container-tab-action--mute'),
            'close': this.element.querySelector('.container-tab-close'),
        }
        this.elements['link'].setAttribute('data-tab-id', this.tab.id)
        this.elements['link'].setAttribute('data-ci-id', this.tab.cookieStoreId)

        this.elements.favicon.addEventListener('error', () => {
            this.elements.favicon.src = FAVICON_FALLBACK
            this.elements.favicon.classList.add(FAVICON_FALLBACK_CLASS)
        })

        this.elements.audible.addEventListener('click', (e) => {
            e.stopPropagation()
            e.preventDefault()
            browser.tabs.update(this.id, {
                muted: !(this.tab.mutedInfo && this.tab.mutedInfo.muted)
            })
        })

        this.elements.close.addEventListener('click', this._removeCloseClick.bind(this))

        this.element.addEventListener('click', (e) => {
            // prevent reloading tab
            e.preventDefault()
            e.stopPropagation()
            if (e.button !== 0) return
            browser.tabs.update(this.id, {
                active: true
            })
        })

        // use mousedown because click does not fire for middle button
        // we would have to have an 'a' element in order for it to work
        this.element.addEventListener('mousedown', (e) => {
            if(e.which !== 2) return; // middle mouse
            this._removeCloseClick(e)
        })

        if (this.tab.pinned) {
            browser.contextualIdentities.get(this.tab.cookieStoreId).then((ci) => {
                this.elements['link'].style.borderBottomColor = ci.colorCode
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
        if (box.bottom < 0 || box.top > window.innerHeight) {
            this.element.scrollIntoView({
                block: "end",
                behavior: "auto"
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

        let link = this.elements['link']

        link.href = this.tab.url
        this.elements.title.innerText = this.tab.title //+ ` - (${this.tab.index})`
        link.title = this.tab.title

        if (this.tab.active) {
            link.classList.add('tab-active')
        } else {
            link.classList.remove('tab-active')
        }
        if (this.tab.pinned) {
            link.classList.add('tab-pinned')
        } else {
            link.classList.remove('tab-pinned')
        }
        if (this.tab.mutedInfo && this.tab.mutedInfo.muted) {
            this.elements.audible.src = ICON_MUTED
        } else if (this.tab.audible) {
            this.elements.audible.src = ICON_AUDIBLE
        }
        if (this.tab.audible || (this.tab.mutedInfo && this.tab.mutedInfo.muted)) {
            this.elements.audible.classList.add('audible')
        } else {
            this.elements.audible.classList.remove('audible')
        }
    }
}