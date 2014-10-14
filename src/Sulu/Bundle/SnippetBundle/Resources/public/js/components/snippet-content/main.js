/*
 * This file is part of the Sulu CMS.
 *
 * (c) MASSIVE ART WebServices GmbH
 *
 * This source file is subject to the MIT license that is bundled
 * with this source code in the file LICENSE.
 */

/**
 * handles snippet selection
 *
 * @class SnippetSelection
 * @constructor
 */
define([], function() {

    'use strict';

    var defaults = {
            visibleItems: 999,
            instanceName: null,
            urlGet: null,
            idsParameter: 'ids',
            preselected: {ids: []},
            idKey: 'id',
            titleKey: 'title',
            resultKey: '',
            urlAll: null,
            language: null,
            snippetType: null,
            webspace: null,
            translations: {
                noSnippetsSelected: 'snippet-content.nosnippets-selected',
                addSnippets: 'snippet-content.add',
                visible: 'public.visible',
                of: 'public.of'
            }
        },

        dataDefaults = {
            ids: [],
            displayOption: 'top',
            config: {}
        },

        /**
         * namespace for events
         * @type {string}
         */
        eventNamespace = 'sulu.snippet-content.',

        /**
         * raised when the overlay data has been changed
         * @event sulu.snippet-content.data-changed
         */
        DATA_CHANGED = function() {
            return createEventName.call(this, 'data-changed');
        },

        /**
         * returns normalized event names
         */
        createEventName = function(postFix) {
            return eventNamespace + (this.options.instanceName ? this.options.instanceName + '.' : '') + postFix;
        },

        templates = {
            skeleton: function(options) {
                return [
                    '<div class="white-box form-element" id="', options.ids.container, '">',
                    '   <div class="header">',
                    '       <span class="fa-plus-circle icon left action" id="', options.ids.addButton, '"></span>',
                    '       <span class="fa-cog icon right border " id="', options.ids.configButton, '" style="display: none;"></span>',
                    '   </div>',
                    '   <div class="content" id="', options.ids.content, '"></div>',
                    '</div>'
                ].join('');
            },

            noContent: function(noContentString) {
                return [
                    '<div class="no-content">',
                    '   <span class="fa-coffee icon"></span>',
                    '   <div class="text">', noContentString, '</div>',
                    '</div>'
                ].join('');
            },

            data: function(options) {
                return[
                    '<div id="', options.ids.snippetList, '"/>',
                ].join('');
            },

            contentItem: function(id, num, value) {
                return [
                    '<li data-id="', id, '">',
                    '   <span class="num">', num, '</span>',
                    '   <span class="value">', value, '</span>',
                    '   <span class="fa-times remove"></span>',
                    '</li>'
                ].join('');
            }
        },

        /**
         * returns id for given type
         */
        getId = function(type) {
            return '#' + this.options.ids[type];
        },

        /**
         * render component
         */
        render = function() {
            // init ids
            this.options.ids = {
                container: 'snippet-content-' + this.options.instanceName + '-container',
                addButton: 'snippet-content-' + this.options.instanceName + '-add',
                configButton: 'snippet-content-' + this.options.instanceName + '-config',
                displayOption: 'snippet-content-' + this.options.instanceName + '-display-option',
                content: 'snippet-content-' + this.options.instanceName + '-content',
                chooseTab: 'snippet-content-' + this.options.instanceName + '-choose-tab',
                snippetList: 'snippet-content-' + this.options.instanceName + '-column-navigation'
            };
            this.sandbox.dom.html(this.$el, templates.skeleton(this.options));

            // init container
            this.$container = this.sandbox.dom.find(getId.call(this, 'container'), this.$el);
            this.$content = this.sandbox.dom.find(getId.call(this, 'content'), this.$el);
            this.$addButton = this.sandbox.dom.find(getId.call(this, 'addButton'), this.$el);
            this.$configButton = this.sandbox.dom.find(getId.call(this, 'configButton'), this.$el);

            // set preselected values
            if (!!this.sandbox.dom.data(this.$el, 'snippet-content')) {
                var data = this.sandbox.util.extend(true, {}, dataDefaults, this.sandbox.dom.data(this.$el, 'snippet-content'));
                setData.call(this, data);
            } else {
                setData.call(this, this.options.preselected);
            }

            // render no images selected
            renderStartContent.call(this);

            // sandbox event handling
            bindCustomEvents.call(this);

            // init vars
            this.itemsVisible = this.options.visibleItems;

            this.URIGet = {
                str: '',
                hasChanged: false
            };
            this.URIGetAll = {
                str: '',
                hasChanged: false
            };

            // generate URIs for data
            setURIGet.call(this);
            setURIGetAll.call(this);

            // set display-option value
            setDisplayOption.call(this);

            // init overlays
            startAddOverlay.call(this);

            // load preselected items
            loadContent.call(this);

            // handle dom events
            bindDomEvents.call(this);
        },

        /**
         * Renders the content at the beginning
         * (with no items and before any request)
         */
        renderStartContent = function() {
            var label = this.sandbox.translate(this.options.translations.noSnippetsSelected);
            this.sandbox.dom.html(this.$content, templates.noContent(label));
        },

        /**
         * custom event handling
         */
        bindCustomEvents = function() {
            this.sandbox.on('husky.overlay.snippet-content.' + this.options.instanceName + '.add.initialized', initSnippetList.bind(this));

            this.sandbox.dom.on(getId.call(this, 'content'), 'click', removeSnippet.bind(this), 'li .remove');

            // adjust position of overlay after column-navigation has initialized
            this.sandbox.on('husky.datagrid.initialized', function() {
                this.sandbox.emit('husky.overlay.snippet-content.' + this.options.instanceName + '.add.set-position');
            }.bind(this));
        },

        /**
         * Handles the click on the remove icons
         * @param event
         */
        removeSnippet = function(event) {
            var $element = this.sandbox.dom.parents(event.currentTarget, 'li'),
                dataId = this.sandbox.dom.data($element, 'id');

            // remove element from dom
            this.sandbox.dom.remove($element);

            // from js-arrays
            this.data.ids.splice(this.data.ids.indexOf(dataId), 1);
            removeItemWithId.call(this, dataId);

            detachFooter.call(this);
            if (this.items.length === 0) {
                renderStartContent.call(this);
            } else {
                this.itemsVisible = this.options.visibleItems;
                renderFooter.call(this);
            }
            this.sandbox.emit('husky.column-navigation.'+ this.options.instanceName +'.unmark', dataId);
            setData.call(this, this.data);
            this.sandbox.emit(DATA_CHANGED.call(this), this.data, this.$el);
        },

        /**
         * Removes an item for a given id
         * @param id {Number|String} the id of an item
         */
        removeItemWithId = function(id) {
            for (var i = -1, length = this.items.length; ++i < length;) {
                if (id === this.items[i].id) {
                    this.items.splice(i ,1);
                    return true;
                }
            }
            return false;
        },

        /**
         * initialize column navigation
         */
        initSnippetList = function() {

            this.sandbox.start([
                {
                    name: 'datagrid@husky',
                    options: {
                        url: this.URIGetAll.str,
                        preselected: [],
                        pagination: false,
                        resultKey: 'snippets',
                        sortable: true,
                        searchInstanceName: 'test',
                        searchFields: ['title'],
                        columnOptionsInstanceName: '',
                        el: getId.call(this, 'snippetList'),
                        matchings: [
                            {
                                content: 'Title',
                                width: "100%",
                                name: "title",
                                editable: true,
                                sortable: true,
                                type: 'title',
                                validation: {
                                    required: false
                                }
                            }
                        ]
                    }
                }
            ]);
        },

        /**
         * handle dom events
         */
        bindDomEvents = function() {
            this.sandbox.dom.on(getId.call(this, 'displayOption'), 'change', function() {
                setData.call(this, {displayOption: this.sandbox.dom.val(getId.call(this, 'displayOption'))});
                this.sandbox.emit(DATA_CHANGED.call(this), this.data, this.$el);
            }.bind(this));

            this.sandbox.dom.on(this.$el, 'click', removeSnippet.bind(this), '.-list .remove');
        },

        /**
         * renders the content decides whether the footer is rendered or not
         */
        renderContent = function() {
            if (this.items.length !== 0) {
                this.linkList = this.sandbox.dom.createElement('<ul class="items-list"/>');

                this.sandbox.util.each(this.items, function (i) {
                    renderSnippetItem.call(this, this.items[i], this.linkList);
                }.bind(this));

                this.sandbox.dom.html(this.$content, this.linkList);
                renderFooter.call(this);
            } else {
                renderStartContent.call(this);
                detachFooter.call(this);
            }
        },

        /**
         * Renders a single link item
         * @param item
         */
        renderSnippetItem = function(item, container) {
            this.sandbox.dom.append(container,
                templates.contentItem(
                    item[this.options.idKey],
                    this.sandbox.dom.find('li', container).length + 1,
                    item[this.options.titleKey]
                )
            );
        },

        /**
         * renders the footer and calls a method to bind the events for itself
         */
        renderFooter = function() {
            this.itemsVisible = (this.items.length < this.itemsVisible) ? this.items.length : this.itemsVisible;

            if (this.$footer === null || this.$footer === undefined) {
                this.$footer = this.sandbox.dom.createElement('<div class="footer"/>');
            }

            this.sandbox.dom.append(this.$container, this.$footer);
        },

        /**
         * starts the overlay component
         */
        startAddOverlay = function() {
            var $element = this.sandbox.dom.createElement('<div/>');

            this.sandbox.dom.append(this.$el, $element);
            this.sandbox.start([
                {
                    name: 'overlay@husky',
                    options: {
                        triggerEl: this.$addButton,
                        cssClass: 'snippet-content-overlay',
                        el: $element,
                        container: this.$el,
                        instanceName: 'snippet-content.' + this.options.instanceName + '.add',
                        skin: 'wide',
                        slides: [
                            {
                                title: this.sandbox.translate(this.options.translations.addSnippets),
                                cssClass: 'snippet-content-overlay-add',
                                data: templates.data(this.options),
                                okCallback: addSnippets.bind(this)
                            }
                        ]
                    }
                }
            ]);
        },

        addSnippets = function () {
            this.sandbox.emit('husky.datagrid.items.get-selected', function(selected) {
                this.data.ids = this.data.ids.concat(selected);
                setData.call(this, this.data);
                setURIGet.call(this);
                loadContent.call(this);
                this.sandbox.emit(DATA_CHANGED.call(this), this.data, this.$el);
            }.bind(this));
        },

        /**
         * starts the loader component
         */
        startLoader = function() {
            detachFooter.call(this);

            var $loaderContainer = this.sandbox.dom.createElement('<div class="loader"/>');
            this.sandbox.dom.html(this.$content, $loaderContainer);

            this.sandbox.start([
                {
                    name: 'loader@husky',
                    options: {
                        el: $loaderContainer,
                        size: '100px',
                        color: '#e4e4e4'
                    }
                }
            ]);
        },

        /**
         * removes the footer
         */
        detachFooter = function() {
            if (this.$footer !== null) {
                this.sandbox.dom.remove(this.$footer);
            }
        },

        /**
         * load content from generated uri
         */
        loadContent = function() {
            //only request if URIGet has changed
            if (this.URIGet.hasChanged === true) {

                var thenFunction = function(data) {
                    this.items = data;

                    renderContent.call(this);
                }.bind(this);

                startLoader.call(this);

                // reset item visible
                this.itemsVisible = this.options.visibleItems;

                if (!!this.data.ids && this.data.ids.length > 0) {
                    this.sandbox.util.load(this.URIGet.str)
                        .then(thenFunction.bind(this))
                        .fail(function (error) {
                            this.sandbox.logger.log(error);
                        }.bind(this));
                } else {
                    thenFunction.call(this, {_embedded: []});
                }
            }
        },

        /**
         * set data of snippet-content
         */
        setData = function(data) {
            for (var propertyName in data) {
                if (data.hasOwnProperty(propertyName)) {
                    this.data[propertyName] = data[propertyName];
                }
            }
            this.sandbox.dom.data(this.$el, 'snippet-content', this.data);
        },

        /**
         * generates the URI for getting snippets
         */
        setURIGet = function() {
            var newURIGet = [
                this.options.urlGet,
                '/',
                (this.data.ids || []).join(','),
                '?language=',
                this.options.language,
                '&webspace=',
                this.options.webspace
            ].join('');

            if (newURIGet !== this.URIGet.str) {
                this.URIGet.str = newURIGet;
                this.URIGet.hasChanged = true;
            } else {
                this.URIGet.hasChanged = false;
            }
        },

        /**
         * generates the URI for getting all the snippets of the configured type
         */
        setURIGetAll = function() {
            var newURIGetAll = [
                this.options.urlAll,
                '?language=de',
                '&webspace=',
                this.options.webspace,
                '&type=',
                this.options.snippetType
            ].join('');

            if (newURIGetAll !== this.URIGetAll.str) {
                this.URIGetAll.str = newURIGetAll;
                this.URIGetAll.hasChanged = true;
            } else {
                this.URIGetAll.hasChanged = false;
            }
        },

        /**
         * set display option to element
         */
        setDisplayOption = function() {
            this.sandbox.dom.val(getId.call(this, 'displayOption'), this.data.displayOption);
        };

    return {
        historyClosed: true,

        initialize: function() {

            // extend default options
            this.options = this.sandbox.util.extend({}, defaults, this.options);

            this.data = {};
            this.linkList = null;

            this.sandbox.util.each([
                'snippetType', 'language', 'webspace', 'urlGet', 'urlAll'
            ], function (key) {
                if (this.options[key] === null) {
                    throw 'you must specify the "' + key + '" option';
                }
            }.bind(this));

            render.call(this);
        }
    };
});
