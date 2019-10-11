const ContextMenuManager = {
    contextMenuElement: null,
    contextOverlay: null,
    contextMenu: null,

    init() {
        this.contextMenuElement = document.getElementById('context-menu')
        this.contextOverlay = document.getElementById('context-menu-overlay')

        this.contextOverlay.addEventListener('mousedown', (event) => {
            event.preventDefault()
            event.stopPropagation()
            this.hide()
        })

        // when window loses focus close the context menu
        window.addEventListener('blur', () => {
            if(this.contextMenu) {
                this.hide()
            }
        })
    },

    show(menu, x, y) {
        if(this.contextMenu) {
            this.hide()
        }
        this.contextOverlay.style.pointerEvents = 'all';
        this.contextMenu = menu
        const contextMenuElement = this.contextMenuElement
        menu.render(contextMenuElement)

        // decide whether to render on left or right hand side
        let cX = x
        if(x > window.innerWidth/2) {
            cX -= contextMenuElement.offsetWidth
        }
        
        if(cX < 0) {
            cX = 0;
        }

        // above or below
        let cY = y
        if(y+contextMenuElement.offsetHeight > window.innerHeight) {
            cY -= contextMenuElement.offsetHeight
        }

        contextMenuElement.style.left = cX+'px'
        contextMenuElement.style.top = cY+'px'
        let maxWidth = x
        if(x == cX) {
            maxWidth = window.innerWidth - x 
        }
        contextMenuElement.style.maxWidth = (maxWidth + 10) + 'px'
    },

    hide() {
        if(this.contextMenu) {
            this.contextOverlay.style.pointerEvents = 'none';
            //this.contextMenu.destroy()
            this.contextMenu = null
            
            // clear children of context menu element
            const contextMenu = this.contextMenuElement.cloneNode(false);
            const contextMenuElement = this.contextMenuElement
            contextMenuElement.parentNode.replaceChild(contextMenu, contextMenuElement);
            this.contextMenuElement = contextMenu
        }
    }
}

class ContextMenu {
    constructor(context, options = []) {
        this.options = new Map()
        for(let option of options) {
            this.addOption(option.label, option.action)
        }
    }

    addOption(label, action) {
        this.options.set(browser.i18n.getMessage(label), action)
    }

    render(parent) {
        this.options.forEach((action, key) => {
            const listElement = document.createElement('li')
            listElement.className = 'context-menu-element'
            listElement.innerText = key
            listElement.addEventListener('click', (event) => {
                action()
                ContextMenuManager.hide()
            })
            parent.appendChild(listElement)
        })
    }
}