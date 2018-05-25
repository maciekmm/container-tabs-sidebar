class ContextualIdentityContainer extends AbstractTabContainer {
    constructor(contextualIdentity, element) {
        super(element)
        this.contextualIdentity = contextualIdentity
        this.id = contextualIdentity.cookieStoreId
    }

    init() {
        this._createElements()
        super.init()

        this.element.addEventListener('drop', (e) => {
            e.preventDefault()
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            let [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            tabId = parseInt(tabId);
            pinned = pinned != 'false'

            if (this.id != contextualIdentity) {
                e.dataTransfer.dropEffect = 'none'
                return
            }

            e.currentTarget.classList.remove('container-dragged-over')
            let index = -1
            if(this.tabs.size > 0) {
                index = this.tabs.values().next().value.tab.index
            }

            //if moved from pinned container
            if(pinned) {
                browser.tabs.update(tabId, {
                    pinned: false,
                }).then(() => {
                    browser.tabs.move(tabId, {
                        windowId: ContainerTabsSidebar.WINDOW_ID,
                        index: index // move to the front
                    })
                })
            } else {
                browser.tabs.move(tabId, {
                    windowId: ContainerTabsSidebar.WINDOW_ID,
                    index: index // move to the end
                })
            }
        })

        this.element.addEventListener('dragover', (e) => {
            e.preventDefault()
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            const [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            if (this.id != contextualIdentity) {
                e.dataTransfer.dropEffect = 'none'
                return
            }
            e.dataTransfer.dropEffect = 'move'
            e.currentTarget.classList.add('container-dragged-over')
            return false
        })

        this.elements.containerHeader.addEventListener('contextmenu', (e) => {
            e.preventDefault()
            if (ContainerTabsSidebar.contextMenu) {
                ContainerTabsSidebar.hideContextMenu()
                return
            }

            const contextMenu = new ContextMenu(this)

            contextMenu.addOption('Reload all', () => {
                Array.from(this.tabs.keys()).forEach((tabId) => {
                    browser.tabs.reload(tabId)
                })
            })

            contextMenu.addOption('Close all', () => {
                browser.tabs.remove(Array.from(this.tabs.keys()))
            })

            ContextMenuManager.show(contextMenu, e.clientX, e.clientY)
        })
    }

    _handleTabActivated(tab) {
        this.collapsed = false
        super._handleTabActivated(tab)
    }

    _handleTabCreated(newTab) {
        if (newTab.cookieStoreId !== this.id) return
        if (newTab.windowId !== ContainerTabsSidebar.WINDOW_ID) return
        this.render(true, () => {
            const renderedTab = this.tabs.get(newTab.id)
            if (renderedTab) {
                renderedTab.scrollIntoView()
            }
        })
    }

    _handleTabPinned(tabId, change, tab) {
        if (tab.pinned) {
            this.removeTab(tabId)
        } else {
            this.render(true)
        }
    }

    _createElements() {
        this.elements = {}
        this.elements.containerHeader = document.createElement('div')
        this.elements.containerHeader.className = 'container-header'

        // favicon
        this.elements.icon = document.createElement('img')
        this.elements.icon.className = 'container-icon'
        this.elements.containerHeader.appendChild(this.elements.icon)

        // title
        this.elements.title = document.createElement('span')
        this.elements.containerHeader.appendChild(this.elements.title)

        // actions
        this.elements.actions = document.createElement('div')
        this.elements.actions.className = 'container-actions';

        // action-newtab
        this.elements.newTab = document.createElement('span')
        this.elements.newTab.href = '#'
        this.elements.newTab.className = 'container-action container-action--newtab'
        this.elements.newTab.innerText = '+'
        this.elements.newTab.addEventListener('click', (evt) => {
            evt.stopPropagation()
            this._actionNewTab()
        })
        this.elements.actions.appendChild(this.elements.newTab)

        // action-collapse
        this.elements.collapse = document.createElement('span')
        this.elements.collapse.href = '#'
        this.elements.collapse.className = 'container-action container-action--collapse'
        this.elements.actions.appendChild(this.elements.collapse)
        this.elements.containerHeader.appendChild(this.elements.actions)

        // add the whole header to parent element
        this.element.appendChild(this.elements.containerHeader)

        // list of tabs in container
        this.elements.tabsContainer = document.createElement('ul')
        this.elements.tabsContainer.className = 'container-tabs'
        this.element.appendChild(this.elements.tabsContainer)

        // collapse/show
        this.elements.containerHeader.addEventListener('click', () => {
            this.collapsed = !this.collapsed
        })
    }

    _actionNewTab() {
        browser.tabs.create({
            cookieStoreId: this.id
        }).then(() => {
            this.collapsed = false
        })
    }

    set collapsed(val) {
        this._collapsed = val
        this.render(false)
    }

    get collapsed() {
        return this._collapsed
    }

    refresh(contextualIdentity) {
        this.contextualIdentity = contextualIdentity
        this.render(false)
    }

    render(updateTabs, callback) {
        // styling (border according to container config)
        const containerHeader = this.elements.containerHeader
        containerHeader.style.borderLeftColor = this.contextualIdentity.colorCode

        // favicon
        this.elements.icon.src = this.contextualIdentity.iconUrl

        // title
        const titleElement = this.elements.title
        titleElement.className = 'container-title'
        titleElement.innerText = this.contextualIdentity.name + ' (' + this.tabs.size + ')'

        // collapse
        this.elements.collapse.innerText = (this._collapsed ? '▴' : '▾')
        if (this._collapsed) {
            this.element.classList.add('collapsed')
        } else {
            this.element.classList.remove('collapsed')
        }

        if (updateTabs) {
            browser.tabs.query({
                currentWindow: true,
                cookieStoreId: this.id,
                pinned: false
            }).then((res) => {
                this.renderTabs(this.elements.tabsContainer, res)
                this.render(false, callback)
            })
        } else {
            if (callback) {
                callback()
            }
        }
    }
}