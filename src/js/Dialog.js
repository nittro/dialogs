_context.invoke('Nittro.Extras.Dialogs', function(DOM, CSSTransitions, Arrays, ReflectionClass) {

    var Dialog = _context.extend('Nittro.Object', function(name, options) {
        Dialog.Super.call(this);

        this._.name = name;
        this._.options = Arrays.mergeTree({}, Dialog.getDefaults(this.constructor), options);

        this._.state = {
            visible: false,
            destroying: false,
            current: 'hidden',
            scrollLock: false,
            next: null,
            promise: null,
            cancel: null
        };

        this._.scrollPosition = null;
        this._.keyMap = null;
        this._.tabContext = null;
        this._.origFocusTarget = null;
        this._.ios = /ipod|ipad|iphone/i.test(navigator.userAgent);

        this._.elms = {
            holder : DOM.createFromHtml(this._.options.templates.holder),
            wrapper : DOM.createFromHtml(this._.options.templates.wrapper),
            content : null,
            buttons : null
        };

        this._.elms.holder.appendChild(this._.elms.wrapper);

        if (this._.ios) {
            DOM.addClass(this._.elms.holder, 'nittro-dialog-ios');
        }

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

        try {
            var keymap = ReflectionClass.from('Nittro.Extras.Keymap.Keymap'),
                tabContext = ReflectionClass.from('Nittro.Extras.Keymap.TabContext');

            this._.keyMap = keymap.newInstance();
            this._.tabContext = tabContext.newInstance();
        } catch (e) {}


        if (this._.keyMap && this._.options.keyMap) {
            this._handleKey = this._handleKey.bind(this);

            for (var key in this._.options.keyMap) {
                if (this._.options.keyMap.hasOwnProperty(key)) {
                    this._.keyMap.add(key, this._handleKey);
                }
            }
        }

        if (this._.tabContext && this._.elms.buttons) {
            this._.tabContext.addFromContainer(this._.elms.buttons, true);
        }

        this.on('button:default', this.hide.bind(this));
        this.on('show', this._saveFocusedElement.bind(this));
        this.on('hide', this._restoreFocusedElement.bind(this));

        DOM.addListener(this._.elms.wrapper, 'click', this._handleClick.bind(this));
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
                    'Escape': 'close'
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
                } while ((type = type.Super) && type !== Dialog.Super);

                return defaults;
            },
            setDefaults: function(options) {
                Arrays.mergeTree(Dialog.defaults, options);
            }
        },

        getName: function () {
            return this._.name;
        },

        isVisible: function(next) {
            return this._.state.current === 'visible' && !this._.state.next
                || next && this._.state.next === 'visible';
        },

        show: function() {
            return this._setState('visible', function (done) {
                this._lockScrolling();
                this._setVisible(true);

                DOM.toggleClass(this._.elms.holder, 'visible', true);
                DOM.toggleClass(this._.elms.holder, 'busy', false);

                CSSTransitions.run(this._.elms.wrapper)
                    .then(done.bind(this, 'shown'));
            });
        },

        hide: function() {
            return this._setState('hidden', function (done) {
                this._unlockScrolling();
                this._setVisible(false);

                DOM.toggleClass(this._.elms.holder, 'visible', false);
                DOM.toggleClass(this._.elms.holder, 'busy', false);

                CSSTransitions.run(this._.elms.wrapper)
                    .then(done.bind(this, 'hidden'));
            });
        },

        isBusy: function (next) {
            return this._.state.current === 'busy' && !this._.state.next
                || next && this._.state.next === 'busy';
        },

        setBusy: function () {
            return this._setState('busy', function (done) {
                this._lockScrolling();
                this._setVisible(true);

                DOM.toggleClass(this._.elms.holder, 'visible', true);
                DOM.toggleClass(this._.elms.holder, 'busy', true);

                CSSTransitions.run(this._.elms.wrapper)
                    .then(done.bind(this, 'busy'));
            });
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

        getTabContext: function () {
            return this._.tabContext;
        },

        destroy: function () {
            if (this._.state.destroying) {
                return this._.state.promise || Promise.resolve(null);
            }

            this._.state.destroying = true;
            this.trigger('destroy');

            if (this._.state.current !== 'hidden') {
                return this.hide().then(this._doDestroy.bind(this));
            } else {
                return this._doDestroy();
            }
        },

        _doDestroy: function () {
            if (this._.state.cancel) {
                this._.state.cancel();
            }

            this.trigger('destroyed');

            if (this._.elms.holder.parentNode) {
                this._.elms.holder.parentNode.removeChild(this._.elms.holder);
            }

            this.off();

            this._.state = null;

            for (var k in this._.elms) if (this._.elms.hasOwnProperty(k)) {
                this._.elms[k] = null;
            }

            return Promise.resolve(null);
        },

        _setState: function (state, init, cancel) {
            if (!this._.state || this._.state.current === state) {
                return Promise.resolve();
            } else if (this._.state.next === state) {
                return this._.state.promise;
            } else if (this._.state.cancel) {
                this._.state.cancel();
            }

            this._.state.next = state;

            return this._.state.promise = new Promise(function (fulfill) {
                var resolved = null;

                this._.state.cancel = function () {
                    if (resolved === null) {
                        resolved = false;
                        this._.state.next = null;
                        this._.state.promise = null;
                        this._.state.cancel = null;
                        cancel && cancel.call(this);
                        fulfill();
                    }
                }.bind(this);

                init.call(this, function(evt) {
                    if (resolved === null) {
                        resolved = true;
                        this._.state.current = state;
                        this._.state.next = null;
                        this._.state.promise = null;
                        this._.state.cancel = null;
                        evt && this.trigger(evt);
                        fulfill();
                    }
                }.bind(this));
            }.bind(this));
        },

        _setVisible: function (state) {
            if (this._.state.visible !== state) {
                this._.state.visible = state;
                this.trigger(state ? 'show' : 'hide');
            }
        },

        _saveFocusedElement: function () {
            this._.origFocusTarget = document.activeElement;
            this._.origFocusTarget && this._.origFocusTarget.blur && this._.origFocusTarget.blur();
        },

        _restoreFocusedElement: function () {
            this._.origFocusTarget && DOM.contains(document, this._.origFocusTarget) && this._.origFocusTarget.focus();
            this._.origFocusTarget = null;
        },

        _lockScrolling: function () {
            if (this._.state.scrollLock) {
                return;
            }

            this._.state.scrollLock = true;

            if (this._.ios) {
                this._.scrollPosition = window.pageYOffset;
                window.scrollTo(0, 0);
            } else {
                this._.scrollLock = {
                    left: window.pageXOffset,
                    top: window.pageYOffset
                };

                DOM.addListener(window, 'scroll', this._handleScroll);
            }
        },

        _unlockScrolling: function () {
            if (!this._.state.scrollLock) {
                return;
            }

            this._.state.scrollLock = false;

            if (this._.ios) {
                window.scrollTo(0, this._.scrollPosition);
                this._.scrollPosition = null;
            } else {
                DOM.removeListener(window, 'scroll', this._handleScroll);
                this._.scrollLock = null;
            }
        },

        _createButtons: function () {
            var action, btn, def;

            for (action in this._.options.buttons) {
                if (this._.options.buttons.hasOwnProperty(action)) {
                    btn = DOM.createFromHtml(this._.options.templates.button);

                    def = this._.options.buttons[action];

                    if (typeof def === 'string') {
                        def = {label: def, type: 'button'};
                    }

                    DOM.setData(btn, 'action', action);
                    DOM.addClass(btn, 'nittro-dialog-button', def.type && def.type !== 'button' ? 'nittro-dialog-button-' + def.type : '');
                    btn.textContent = def.label;

                    this._.elms.buttons.appendChild(btn);
                }
            }
        },

        _handleClick: function (evt) {
            var action = DOM.getData(evt.target, 'action');

            if (action) {
                evt.preventDefault();

                this.trigger('button', {
                    action: action
                });
            }
        },

        _handleKey: function (key, evt) {
            if (evt.target && evt.target.tagName && evt.target.tagName.match(/^(input|button|textarea|select)$/i) && DOM.contains(this._.elms.wrapper, evt.target)) {
                return false;
            } else {
                this.trigger('button', {
                    action: this._.options.keyMap[key]
                });
            }
        },

        _handleScroll: function (evt) {
            if (evt.target === window || evt.target === document) {
                window.scrollTo(this._.scrollLock.left, this._.scrollLock.top);
            }
        }
    });

    _context.register(Dialog, 'Dialog');

}, {
    DOM: 'Utils.DOM',
    CSSTransitions: 'Utils.CSSTransitions',
    Arrays: 'Utils.Arrays',
    ReflectionClass: 'Utils.ReflectionClass'
});
