_context.invoke('Nittro.Extras.Dialogs', function(DOM, CSSTransitions, Arrays, ReflectionClass) {

    var Dialog = _context.extend('Nittro.Object', function(options) {
        Dialog.Super.call(this);

        this._.options = Arrays.mergeTree({}, Dialog.getDefaults(this.constructor), options);
        this._.visible = false;
        this._.scrollPosition = null;
        this._.keyMap = null;

        this._.elms = {
            holder : DOM.createFromHtml(this._.options.templates.holder),
            wrapper : DOM.createFromHtml(this._.options.templates.wrapper),
            content : null,
            buttons : null
        };

        this._.elms.holder.appendChild(this._.elms.wrapper);

        if (this._.options.classes) {
            DOM.addClass(this._.elms.holder, this._.options.classes);

        }

        if (this._.options.content) {
            this._.elms.content = this._.options.content;
            DOM.toggleClass(this._.elms.content, 'nittro-dialog-content', true);
            this._.options.content = null;

        } else if (this._.options.text) {
            this._.elms.content = DOM.createFromHtml(this._.options.templates.content);

            var content = DOM.create('p');
            content.textContent = this._.options.text;
            this._.elms.content.appendChild(content);

        } else if (this._.options.html) {
            this._.elms.content = DOM.createFromHtml(this._.options.templates.content);
            DOM.html(this._.elms.content, this._.options.html);

        }

        if (this._.elms.content) {
            this._.elms.wrapper.appendChild(this._.elms.content);
        }

        if (this._.options.buttons) {
            if (this._.options.buttons instanceof HTMLElement) {
                this._.elms.buttons = this._.options.buttons;
                DOM.toggleClass(this._.elms.buttons, 'nittro-dialog-buttons', true);
                this._.options.buttons = null;
            } else {
                this._.elms.buttons = DOM.createFromHtml(this._.options.templates.buttons);
                this._createButtons();
            }

            this._.elms.wrapper.appendChild(this._.elms.buttons);

        }

        DOM.addListener(this._.elms.wrapper, 'click', this._handleButton.bind(this));

        if (this._.options.keyMap) {
            try {
                var Keymap = ReflectionClass.from('Nittro.Extras.Keymap.Keymap');
                this._.keyMap = new Keymap();
            } catch (e) {}

            if (this._.keyMap) {
                this._handleKey = this._handleKey.bind(this);

                for (var key in this._.options.keyMap) {
                    if (this._.options.keyMap.hasOwnProperty(key)) {
                        this._.keyMap.add(key, this._handleKey);
                    }
                }
            }
        }

        this.on('button:default', function() {
            this.hide();

        });

        DOM.addListener(this._.elms.holder, 'touchmove', this._handleTouchScroll.bind(this));
        this._handleScroll = this._handleScroll.bind(this);

    }, {
        STATIC: {
            defaults: {
                classes: null,
                content: null,
                html: null,
                text: null,
                buttons: null,
                keyMap: {
                    'Escape': 'cancel'
                },
                templates: {
                    holder : '<div class="nittro-dialog-holder"></div>',
                    wrapper : '<div class="nittro-dialog-inner"></div>',
                    content : '<div class="nittro-dialog-content"></div>',
                    buttons : '<div class="nittro-dialog-buttons"></div>',
                    button : '<button></button>'
                }
            },
            getDefaults: function (type) {
                var defaults = {},
                    k;

                do {
                    if (type.defaults) {
                        for (k in type.defaults) {
                            if (type.defaults.hasOwnProperty(k) && !defaults.hasOwnProperty(k)) {
                                defaults[k] = type.defaults[k];

                            }
                        }
                    }

                    type = type.Super;

                } while (type && type !== Dialog.Super);

                return defaults;

            },
            setDefaults: function(options) {
                Arrays.mergeTree(Dialog.defaults, options);

            }
        },

        isVisible: function() {
            return this._.visible;

        },

        show: function() {
            if (this._.visible) {
                return;

            }

            this._.visible = true;

            this._.scrollLock = {
                left: window.pageXOffset,
                top: window.pageYOffset
            };

            if (/ipod|ipad|iphone/i.test(navigator.userAgent)) {
                this._.scrollPosition = window.pageYOffset;
                window.scrollTo(0, 0);
                this._.scrollLock.left = 0;
                this._.scrollLock.top = 0;

            }

            DOM.addListener(window, 'scroll', this._handleScroll);
            DOM.addClass(this._.elms.holder, 'visible');

            this.trigger('show');

            return CSSTransitions.run(this._.elms.holder)
                .then(function () {
                    this.trigger('shown');
                    return this;
                }.bind(this));
        },

        hide: function() {
            if (!this._.visible) {
                return;

            }

            this._.visible = false;

            DOM.removeListener(window, 'scroll', this._handleScroll);

            if (/ipod|ipad|iphone/i.test(navigator.userAgent)) {
                window.scrollTo(0, this._.scrollPosition);
                this._.scrollPosition = null;

            }

            this.trigger('hide');

            DOM.removeClass(this._.elms.holder, 'visible');

            return CSSTransitions.run(this._.elms.holder)
                .then(function () {
                    this.trigger('hidden');
                    return this;
                }.bind(this));
        },

        getElement: function () {
            return this._.elms.holder;

        },

        getContent: function() {
            return this._.elms.content;

        },

        getButtons: function() {
            return this._.elms.buttons;

        },

        getKeyMap: function () {
            return this._.keyMap;
        },

        destroy: function () {
            if (this._.visible) {
                this.hide().then(this.destroy.bind(this));

            } else {
                this.trigger('destroy');

                if (this._.elms.holder.parentNode) {
                    this._.elms.holder.parentNode.removeChild(this._.elms.holder);
                }

                this.off();

                for (var k in this._.elms) {
                    this._.elms[k] = null;
                }
            }
        },

        _createButtons: function () {
            var value, btn, def;

            for (value in this._.options.buttons) {
                btn = DOM.createFromHtml(this._.options.templates.button);

                def = this._.options.buttons[value];

                if (typeof def === 'string') {
                    def = { label: def, type: 'button' };

                }

                DOM.setData(btn, 'value', value);
                DOM.addClass(btn, 'nittro-dialog-button', def.type === 'button' ? 'nittro-dialog-button-text' : 'nittro-dialog-button-plain');
                btn.textContent = def.label;

                this._.elms.buttons.appendChild(btn);

            }
        },

        _handleButton: function (evt) {
            var value = DOM.getData(evt.target, 'value');

            if (value) {
                evt.preventDefault();

                this.trigger('button', {
                    value: value
                });
            }
        },

        _handleKey: function (key, evt) {
            if (!evt.target || !evt.target.tagName || !evt.target.tagName.match(/^(input|button|textarea|select)$/i)) {
                this.trigger('button', {
                    value: this._.options.keyMap[key]
                });
            } else {
                return false;
            }
        },

        _handleTouchScroll: function (evt) {
            if (this._.elms.holder === evt.target) {
                evt.preventDefault();

            }
        },

        _handleScroll: function () {
            window.scrollTo(this._.scrollLock.left, this._.scrollLock.top);

        }
    });

    _context.register(Dialog, 'Dialog');

}, {
    DOM: 'Utils.DOM',
    CSSTransitions: 'Utils.CSSTransitions',
    Arrays: 'Utils.Arrays',
    ReflectionClass: 'Utils.ReflectionClass'
});
;
_context.invoke('Nittro.Extras.Dialogs', function(Dialog, DOM, Arrays) {

    var FormDialog = _context.extend(Dialog, function(options, form) {
        FormDialog.Super.call(this, options);

        this.on('button', this._handleButton.bind(this));

        if (this._.options.autoFocus) {
            this.on('show', this._autoFocus.bind(this));

        }

        if (form) {
            this.setForm(form);
        }
    }, {
        STATIC: {
            defaults: {
                classes: 'nittro-dialog-form',
                hideOnSuccess: true,
                autoFocus: true
            },
            setDefaults: function(defaults) {
                Arrays.mergeTree(FormDialog.defaults, defaults);

            }
        },

        setForm: function (form) {
            this._.form = form;
            this._.elms.form = form.getElement();
            DOM.addListener(this._.elms.form, 'submit', this._handleSubmit.bind(this));

            return this;
        },

        setValues: function(values) {
            this._.form.setValues(values);
            return this;

        },

        reset: function() {
            this._.form.reset();
            return this;

        },

        getForm: function() {
            return this._.form;

        },

        _handleSubmit: function(evt) {
            if (!evt.defaultPrevented) {
                if (this._.options.hideOnSuccess) {
                    this.hide();

                }

                this.trigger('success');

            }
        },

        _handleButton: function(evt) {
            if (evt.data.value === 'confirm') {
                evt.preventDefault();
                this._.form.submit();

            } else {
                this._.form.reset();

            }
        },

        _autoFocus: function () {
            try {
                this._.form.getElements().item(0).focus();

            } catch (e) { /* noop */ }
        }
    });

    _context.register(FormDialog, 'FormDialog');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});
;
_context.invoke('Nittro.Extras.Dialogs', function (Dialog, FormDialog, DOM) {

    var Manager = _context.extend(function() {
        this._ = {
            stack: [],
            formLocator: null,
            keymapManager: null,
            zIndex: 1000
        };

        this._handleShow = this._handleShow.bind(this);
        this._handleHidden = this._handleHidden.bind(this);
        this._handleDestroy = this._handleDestroy.bind(this);

    }, {
        setFormLocator: function (formLocator) {
            this._.formLocator = formLocator;
            return this;
        },

        setKeymapManager: function (keymapManager) {
            this._.keymapManager = keymapManager;
            return this;
        },

        createDialog: function (options) {
            var dlg = new Dialog(options);
            this._setup(dlg);
            return dlg;
        },

        createFormDialog: function (options) {
            var dlg = new FormDialog(options);
            this._setup(dlg);

            var frm = dlg.getContent().getElementsByTagName('form').item(0);
            dlg.setForm(this._.formLocator.getForm(frm));

            return dlg;
        },

        hasOpenDialog: function () {
            return this._.stack.length > 0;
        },

        getTopmostOpenDialog: function () {
            return this._.stack.length ? this._.stack[0] : null;
        },

        _setup: function (dialog) {
            dialog.on('show', this._handleShow);
            dialog.on('hide', this._handleHidden);
            dialog.on('destroy', this._handleDestroy);
            document.body.appendChild(dialog.getElement());
        },

        _handleShow: function (evt) {
            if (this._.stack.length) {
                DOM.toggleClass(this._.stack[0].getElement(), 'topmost', false);
            }

            DOM.toggleClass(evt.target.getElement(), 'topmost', true);
            evt.target.getElement().style.zIndex = this._.zIndex + this._.stack.length;
            this._.stack.unshift(evt.target);

            if (this._.keymapManager && evt.target.getKeyMap()) {
                this._.keymapManager.push(evt.target.getKeyMap());
            }
        },

        _handleHidden: function (evt) {
            DOM.toggleClass(evt.target.getElement(), 'topmost', false);

            var index = this._.stack.indexOf(evt.target);

            if (index > -1) {
                this._.stack.splice(index, 1);
            }

            if (this._.stack.length) {
                DOM.toggleClass(this._.stack[0].getElement(), 'topmost', true);
            }

            if (this._.keymapManager && evt.target.getKeyMap()) {
                this._.keymapManager.pop(evt.target.getKeyMap());
            }
        },

        _handleDestroy: function (evt) {
            if (evt.target instanceof FormDialog) {
                this._.formLocator.removeForm(evt.target.getForm().getElement());
            }
        }
    });

    _context.register(Manager, 'Manager');

}, {
    DOM: 'Utils.DOM'
});
