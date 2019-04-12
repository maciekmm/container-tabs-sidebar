class ContextualIdentityContainer extends AbstractTabContainer {
    constructor(contextualIdentity, element) {
        super(element)
        this.contextualIdentity = contextualIdentity
        this.id = contextualIdentity.cookieStoreId
    }

    init() {
        this._createElements()
        super.init()

        this.element.setAttribute('draggable', true)

		this.element.addEventListener('dragstart', (e) => {
			if(!e.target.classList.contains('container'))
				return
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('container/move', this.id);
            this.element.classList.add('container-hdr-dragged');
        })

        this.element.addEventListener('dragover', (e) => {
             if (!e.dataTransfer.types.includes('container/move')) {
                return
            }
			e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = 'move'

			// Mark the last tab if there are any, or the container header if empty
			if (e.currentTarget.lastChild && e.currentTarget.lastChild.lastChild && !this.collapsed)
				e.currentTarget.lastChild.lastChild.classList.add('container-dragged-over')
			else
				e.currentTarget.classList.add('container-dragged-over')

            return false
        })

        this.element.addEventListener('drop', (e) => {
			if (!e.dataTransfer.types.includes('container/move')) {
				return
            }

            e.stopPropagation()

			let targetCont = e.target
			while (!targetCont.classList.contains('container'))
				targetCont = targetCont.parentNode
			let containers = targetCont.parentNode

            targetCont.classList.remove('container-dragged-over')
			if (targetCont.lastChild && targetCont.lastChild.lastChild)
				targetCont.lastChild.lastChild.classList.remove('container-dragged-over')

			let sourceElnt = containers.getElementsByClassName('container-hdr-dragged')[0]
			sourceElnt.classList.remove('container-hdr-dragged')

			// If we are dropping after ourselves, just ignore
			if (targetCont == sourceElnt)
				return false

			// Also skip if we dropped on top of the previous container
			if(targetCont.nextSibling == sourceElnt)
				return

			const oldChild = containers.removeChild(sourceElnt);
			targetCont.parentNode.insertBefore(oldChild, targetCont.nextSibling);

        })

        this.element.addEventListener('drop', (e) => {
            e.preventDefault()
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            let [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            tabId = parseInt(tabId);
            pinned = pinned != 'false'
            e.currentTarget.classList.remove('tab-dragged-over')

            if (this.id != contextualIdentity) {
                // moving tabs between containers
                browser.tabs.get(tabId).then((tab) => {
                    let tabInfo = {
                        // pinned: tab.pinned,
                        openInReaderMode: tab.isInReaderMode,
                        cookieStoreId: this.id
                    }
                    // firefox treats about:newtab as privileged url, but not setting the url allows us to create that page
                    if(tab.url !== 'about:newtab') {
                        tabInfo.url = tab.url
                    }
                    browser.tabs.create(tabInfo).then((tab) => {
                        browser.tabs.remove(tabId)
                    })
                })
                // contextual identity changed
            } else {
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
            }
        })

        this.element.addEventListener('dragover', (e) => {
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            e.preventDefault()
            let [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
			pinned = pinned != 'false'
            if ((this.id != contextualIdentity && pinned)) {
				e.dataTransfer.dropEffect = 'none'
				return
			}

			e.dataTransfer.dropEffect = 'move'
            e.currentTarget.classList.add('tab-dragged-over')

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
