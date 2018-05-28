const ICON_AUDIBLE = 'chrome://global/skin/media/audioUnmutedButton.svg'
const ICON_MUTED = 'chrome://global/skin/media/audioMutedButton.svg'

class ContainerTab {
    constructor(tab, element) {
        this.tab = tab
        this.id = tab.id
        this.element = element
    }

    init() {
        this._createElements()
        this.render()

        browser.tabs.onUpdated.addListener((id, change, tab) => {
            if(tab.id !== this.id) return
            if(!["title", "favIconUrl", "status", "mutedInfo", "audible"].some(prop => Object.keys(change).includes(prop))) return
            this.tab = tab
            this.render()
        })

        this.element.setAttribute('draggable', true)

        this.element.addEventListener('contextmenu', (e) => {
            e.preventDefault()
            if (CntainerTabsSidebar.contextMenu) {
                ContainerTabsSidebar.hideContextMenu()
                return
            }

            const contextMenu = new ContextMenu(this)

            contextMenu.addOption('Reload tab', () => {
                browser.tabs.reload(this.id)
            })

            contextMenu.addOption((this.tab.mutedInfo && this.tab.mutedInfo.muted) ? 'Unmute tab' : 'Mute tab', () => {
                browser.tabs.update(this.id, {
                    muted: !(this.tab.mutedInfo && this.tab.mutedInfo.muted)
                })
            })

            contextMenu.addOption(this.tab.pinned ? 'Unpin tab' : 'Pin tab', () => {
                browser.tabs.update(this.id, {
                    pinned: !this.tab.pinned
                })
            })

            contextMenu.addOption('Duplicate tab', () => {
                browser.tabs.duplicate(this.id)
            })

            contextMenu.addOption('Move tab to new window', () => {
                browser.windows.create({
                    tabId: this.id
                })
            })

            contextMenu.addOption('Close other tabs', () => {
                ContainerTabsSidebar.containers.get(this.tab.cookieStoreId).closeOthers(this.id)
            })

            contextMenu.addOption('Close tab', () => {
                browser.tabs.remove(this.id)
            })

            ContextMenuManager.show(contextMenu, e.clientX, e.clientY)
        })

        this.element.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('tab/move', this.id + '/' + this.tab.cookieStoreId + '/' + this.tab.pinned);
            this.element.classList.add('container-tab-dragged');
        })

        this.element.addEventListener('dragover', (e) => {
            e.preventDefault()
            const [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            if ((this.tab.cookieStoreId != contextualIdentity && !this.tab.pinned) || !e.currentTarget.hasAttribute("data-tab-id")) {
                e.dataTransfer.dropEffect = 'none'
                return
            }
            e.stopPropagation()
            e.dataTransfer.dropEffect = 'move'
            e.currentTarget.classList.add('container-tab-dragged-over')
            return false
        })

        this.element.addEventListener('dragleave', (e) => {
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            if(!target || !target.classList) return 
            e.target.classList.remove('container-tab-dragged-over')
        })

        this.element.addEventListener('dragend', (e) => {
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            e.target.classList.remove('container-tab-dragged-over')
        })

        this.element.addEventListener('drop', (e) => {
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            let [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            tabId = parseInt(tabId);
            pinned = pinned != 'false'

            //                                                  allow moving anything to pinned container
            if ((this.tab.cookieStoreId != contextualIdentity && !this.tab.pinned)) {
                e.dataTransfer.dropEffect = 'none'
                return
            }
            e.stopPropagation()

            e.target.classList.remove('container-tab-dragged-over')
            //   moving from pinned to not  || moving from not pinned to pinned
            if ((!this.tab.pinned && pinned) || (this.tab.pinned && !pinned)) {
                // we need to update the pinned flag as we are moving tabs between pinned and standard containers
                browser.tabs.update(tabId, {
                    pinned: !pinned
                }).then((tab) => {
                    browser.tabs.get(this.tab.id).then((droppedOn) => { // as we pin a tab indexes get shifted by one, thus we need to get new index
                        browser.tabs.move(tabId, {
                            windowId: ContainerTabsSidebar.WINDOW_ID,
                            index: droppedOn.index + 1
                        })
                    })
                })
            } else {
                // just reorder tabs as the pinned status does not change (action within container)
                browser.tabs.move(tabId, {
                    windowId: ContainerTabsSidebar.WINDOW_ID,
                    index: this.tab.index + 1
                })
            }
        })

    }

    destroy() {
        //browser.tabs.onUpdated.removeListener(this.listeners.update)
    }

    _createElements() {
        this.elements = {}
        this.elements.close = document.createElement('span')
        this.elements.close.className = 'container-tab-close'
        this.elements.close.innerText = '✕'
        this.element.appendChild(this.elements.close)
        this.elements.close.addEventListener('click', (e) => {
            e.stopPropagation()
            e.preventDefault()
            browser.tabs.remove(this.id)
        })

        this.elements.favicon = document.createElement('img')
        this.elements.favicon.className = 'favicon'
        this.elements.favicon.addEventListener('error', (e) => {
            this.elements.favicon.src = FAVICON_FALLBACK
        })
        this.element.appendChild(this.elements.favicon)

        this.elements.title = document.createElement('span')
        this.elements.title.className = 'container-tab-title'
        this.element.appendChild(this.elements.title)

        this.elements.audible = document.createElement('img')
        this.elements.audible.className = 'container-tab-action--mute container-tab-action'
        this.elements.audible.src = ICON_MUTED
        this.elements.audible.addEventListener('click', (e) => {
                e.stopPropagation()
                e.preventDefault()
                browser.tabs.update(this.id, {
                    muted: !(this.tab.mutedInfo && this.tab.mutedInfo.muted)
                })
            })
        this.element.appendChild(this.elements.audible)

        this.element.addEventListener('click', (event) => {
            // prevent reloading tab
            event.preventDefault()
            if (event.button == 0) {
                browser.tabs.update(this.id, {
                    active: true
                })
            }
        })

        // use mouseup because click does not fire for middle button
        // we would have to have an 'a' element in order for it to work
        this.element.addEventListener('mouseup', (event) => {
            event.stopPropagation()
            event.preventDefault()
            switch (event.which) {
                case 2: //middle button
                    browser.tabs.remove(this.id)
                    break
            }
        })

        if (this.tab.pinned) {
            browser.contextualIdentities.get(this.tab.cookieStoreId).then((ci) => {
                this.element.style.borderBottomColor = ci.colorCode
            })
        }
    }

    activate() {
        this.tab.active = true
        this.render()
        this.scrollIntoView()
    }

    deactivate() {
        this.tab.active = false
        this.render()
    }

    /**
     * Scrolls the tab element into view if it's outside
     */
    scrollIntoView() {
        const box = this.element.getBoundingClientRect()
        if(box.bottom < 0 || box.top > window.innerHeight) {
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
            this.elements.favicon.src = favIconUrl
        }

        this.element.href = this.tab.url
        this.elements.title.innerText = this.tab.title // + ` - (${this.tab.index})`
        this.element.title = this.tab.title

        if (this.tab.active) {
            this.element.classList.add('tab-active')
        } else {
            this.element.classList.remove('tab-active')
        }
        if (this.tab.pinned) {
            this.element.classList.add('tab-pinned')
        } else {
            this.element.classList.remove('tab-pinned')
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