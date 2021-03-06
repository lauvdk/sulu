/* eslint-disable flowtype/require-valid-file-annotation */
import React from 'react';
import {observable} from 'mobx';
import {mount} from 'enzyme';

jest.mock('sulu-admin-bundle/containers/Toolbar/withToolbar', () => jest.fn((Component) => Component));

jest.mock('sulu-admin-bundle/utils/Translator', () => ({
    translate: function(key) {
        switch (key) {
            case 'sulu_admin.delete':
                return 'Delete';
            case 'sulu_admin.save':
                return 'Save';
            case 'sulu_admin.save_draft':
                return 'Save as draft';
            case 'sulu_admin.save_publish':
                return 'Save and publish';
            default:
                throw Error(key);
        }
    },
}));

jest.mock('sulu-admin-bundle/containers/Form/registries/FieldRegistry', () => ({
    get: jest.fn().mockReturnValue(function() {
        return null;
    }),
}));

jest.mock('sulu-admin-bundle/services/ResourceRequester', () => ({
    get: jest.fn().mockReturnValue({
        then: jest.fn(),
    }),
    put: jest.fn(),
    post: jest.fn().mockReturnValue(Promise.resolve()),
}));

jest.mock('sulu-admin-bundle/containers/Form/stores/MetadataStore', () => ({
    getSchema: jest.fn().mockReturnValue(Promise.resolve({})),
    getSchemaTypes: jest.fn().mockReturnValue(Promise.resolve({})),
    getJsonSchema: jest.fn().mockReturnValue(Promise.resolve({})),
}));

beforeEach(() => {
    jest.resetModules();
});

jest.mock('../../../stores/WebspaceStore', () => ({
    loadWebspace: jest.fn(() => Promise.resolve()),
}));

test('Should load the correct webspace', () => {
    const webspaceStore = require('../../../stores/WebspaceStore');
    const webspace = {key: 'sulu', localizations: [{locale: 'en', default: false}, {locale: 'de', default: true}]};
    const promise = Promise.resolve(webspace);
    webspaceStore.loadWebspace.mockReturnValue(promise);

    const PageForm = require('../PageForm').default;
    const ResourceStore = require('sulu-admin-bundle/stores/ResourceStore').default;
    const resourceStore = new ResourceStore('pages', 1, {locale: observable.box()});

    const router = {
        restore: jest.fn(),
        bind: jest.fn(),
        route: {
            options: {
                locales: true,
            },
        },
        attributes: {
            webspace: 'sulu',
        },
    };
    const pageForm = mount(<PageForm router={router} resourceStore={resourceStore} />);
    expect(pageForm.instance().webspace).toEqual(undefined);

    return promise.then(() => {
        pageForm.update();
        expect(pageForm.instance().webspace.key).toBe(webspace.key);
        expect(pageForm.instance().webspace.localizations.length).toEqual(webspace.localizations.length);
    });
});

test('Should navigate to defined route on back button click', () => {
    const withToolbar = require('sulu-admin-bundle/containers/Toolbar/withToolbar');
    const PageForm = require('../PageForm').default;
    const ResourceStore = require('sulu-admin-bundle/stores/ResourceStore').default;
    const toolbarFunction = withToolbar.mock.calls[0][1];
    const resourceStore = new ResourceStore('pages', 1, {locale: observable.box()});

    const router = {
        restore: jest.fn(),
        bind: jest.fn(),
        route: {
            options: {
                locales: true,
            },
        },
        attributes: {
            webspace: 'sulu',
        },
    };
    const form = mount(<PageForm router={router} resourceStore={resourceStore} />);
    resourceStore.setLocale('de');

    const toolbarConfig = toolbarFunction.call(form.instance());
    toolbarConfig.backButton.onClick();
    expect(router.restore).toBeCalledWith('sulu_content.webspaces', {locale: 'de'});
});

test('Should change locale in form store via locale chooser', () => {
    const webspaceStore = require('../../../stores/WebspaceStore');
    const webspace = {
        key: 'sulu',
        localizations: [{locale: 'en', default: false}, {locale: 'de', default: true}],
        allLocalizations: [{localization: 'en', name: 'en'}, {localization: 'de', name: 'de'}],
    };
    const promise = Promise.resolve(webspace);
    webspaceStore.loadWebspace.mockReturnValue(promise);
    const withToolbar = require('sulu-admin-bundle/containers/Toolbar/withToolbar');
    const PageForm = require('../PageForm').default;
    const ResourceStore = require('sulu-admin-bundle/stores/ResourceStore').default;
    const toolbarFunction = withToolbar.mock.calls[0][1];
    const resourceStore = new ResourceStore('pages', 1, {locale: observable.box()});

    const router = {
        restore: jest.fn(),
        bind: jest.fn(),
        route: {
            options: {
                locales: true,
            },
        },
        attributes: {
            webspace: 'sulu',
            locale: 'de',
        },
    };

    const pageForm = mount(<PageForm router={router} resourceStore={resourceStore} />);
    pageForm.instance().formStore.locale.set('en');

    return promise.then(() => {
        pageForm.update();

        const toolbarConfig = toolbarFunction.call(pageForm.instance());
        expect(toolbarConfig.locale.value).toBe('en');
        expect(toolbarConfig.locale.options).toEqual(
            expect.arrayContaining(
                [
                    expect.objectContaining({label: 'en', value: 'en'}),
                    expect.objectContaining({label: 'de', value: 'de'}),
                ]
            )
        );
    });
});

test('Should show loading templates chooser in toolbar while types are loading', () => {
    const webspaceStore = require('../../../stores/WebspaceStore');
    const webspace = {
        key: 'sulu',
        localizations: [{locale: 'en', default: false}, {locale: 'de', default: true}],
        allLocalizations: [{localization: 'en', name: 'en'}, {localization: 'de', name: 'de'}],
    };
    const promise = Promise.resolve(webspace);
    webspaceStore.loadWebspace.mockReturnValue(promise);
    const withToolbar = require('sulu-admin-bundle/containers/Toolbar/withToolbar');
    const PageForm = require('../PageForm').default;
    const ResourceStore = require('sulu-admin-bundle/stores/ResourceStore').default;
    const toolbarFunction = withToolbar.mock.calls[0][1];
    const resourceStore = new ResourceStore('pages', 1, {locale: observable.box()});

    const router = {
        restore: jest.fn(),
        bind: jest.fn(),
        route: {
            options: {
                locales: true,
            },
        },
        attributes: {
            webspace: 'sulu',
            locale: 'de',
        },
    };

    const pageForm = mount(<PageForm router={router} resourceStore={resourceStore} />);

    const toolbarConfig = toolbarFunction.call(pageForm.instance());
    expect(toolbarConfig).toMatchSnapshot();
});

test('Should show templates chooser in toolbar if types are available', () => {
    const webspaceStore = require('../../../stores/WebspaceStore');
    const webspace = {
        key: 'sulu',
        localizations: [{locale: 'en', default: false}, {locale: 'de', default: true}],
        allLocalizations: [{localization: 'en', name: 'en'}, {localization: 'de', name: 'de'}],
    };
    const webspacePromise = Promise.resolve(webspace);
    webspaceStore.loadWebspace.mockReturnValue(webspacePromise);

    const PageForm = require('../PageForm').default;
    const withToolbar = require('sulu-admin-bundle/containers/Toolbar/withToolbar');
    const ResourceStore = require('sulu-admin-bundle/stores/ResourceStore').default;
    const metadataStore = require('sulu-admin-bundle/containers/Form/stores/MetadataStore');

    const resourceStore = new ResourceStore('pages', 1, {locale: observable.box()});
    resourceStore.loading = false;
    resourceStore.locale.set('de');
    resourceStore.data.template = 'homepage';

    const toolbarFunction = withToolbar.mock.calls[0][1];

    const router = {
        restore: jest.fn(),
        bind: jest.fn(),
        route: {
            options: {
                locales: true,
            },
        },
        attributes: {
            webspace: 'sulu',
            locale: 'de',
        },
    };

    const typesPromise = Promise.resolve({
        sidebar: {key: 'sidebar', title: 'Sidebar'},
        footer: {key: 'footer', title: 'Footer'},
    });
    metadataStore.getSchemaTypes.mockReturnValue(typesPromise);

    const pageForm = mount(<PageForm router={router} resourceStore={resourceStore} />);

    return typesPromise.then(() => {
        const toolbarConfig = toolbarFunction.call(pageForm.instance());
        expect(toolbarConfig).toMatchSnapshot();
    });
});

test('Should change template on click in template chooser', () => {
    const webspaceStore = require('../../../stores/WebspaceStore');
    const webspace = {
        key: 'sulu',
        localizations: [{locale: 'en', default: false}, {locale: 'de', default: true}],
        allLocalizations: [{localization: 'en', name: 'en'}, {localization: 'de', name: 'de'}],
    };
    const webspacePromise = Promise.resolve(webspace);
    webspaceStore.loadWebspace.mockReturnValue(webspacePromise);

    const PageForm = require('../PageForm').default;
    const withToolbar = require('sulu-admin-bundle/containers/Toolbar/withToolbar');
    const ResourceStore = require('sulu-admin-bundle/stores/ResourceStore').default;
    const metadataStore = require('sulu-admin-bundle/containers/Form/stores/MetadataStore');

    const resourceStore = new ResourceStore('pages', 1, {locale: observable.box()});
    resourceStore.loading = false;
    resourceStore.locale.set('de');
    resourceStore.data.template = 'homepage';

    const router = {
        restore: jest.fn(),
        bind: jest.fn(),
        route: {
            options: {
                locales: true,
            },
        },
        attributes: {
            webspace: 'sulu',
            locale: 'de',
        },
    };

    const typesPromise = Promise.resolve({
        homepage: {key: 'homepage', title: 'Homepage'},
        default: {key: 'default', title: 'Default'},
    });
    metadataStore.getSchemaTypes.mockReturnValue(typesPromise);

    const homepageTemplatePromise = Promise.resolve({
        title: {
            label: 'Title',
            type: 'text_line',
        },
        description: {
            label: 'Description',
            type: 'text_line',
        },
    });
    const defaultTemplateMetadata = {
        title: {
            label: 'Title',
            type: 'text_line',
        },
    };
    const defaultTemplatePromise = Promise.resolve(defaultTemplateMetadata);
    metadataStore.getSchema.mockImplementation((resourceKey, type) => {
        switch (type) {
            case 'homepage':
                return homepageTemplatePromise;
            case 'default':
                return defaultTemplatePromise;
        }
    });
    let jsonSchemaResolve;
    const jsonSchemaPromise = new Promise((resolve) => {
        jsonSchemaResolve = resolve;
    });
    metadataStore.getJsonSchema.mockReturnValue(jsonSchemaPromise);

    const pageForm = mount(<PageForm router={router} resourceStore={resourceStore} />);

    jsonSchemaResolve({});

    return Promise.all([
        webspacePromise,
        typesPromise,
        homepageTemplatePromise,
        defaultTemplatePromise,
        jsonSchemaPromise]
    ).then(() => {
        return jsonSchemaPromise.then(() => {
            pageForm.update();
            expect(pageForm.find('Item')).toHaveLength(2);

            const toolbarOptions = withToolbar.mock.calls[0][1].call(pageForm.instance());
            toolbarOptions.items[1].onChange('default');
            const schemaPromise = Promise.resolve(defaultTemplateMetadata);
            metadataStore.getSchema.mockReturnValue(schemaPromise);

            return Promise.all([schemaPromise, jsonSchemaPromise]).then(() => {
                pageForm.update();
                expect(pageForm.find('Item')).toHaveLength(1);
            });
        });
    });
});

test('Should render save buttons disabled only if form is not dirty', () => {
    function getSaveItem(label) {
        const saveButtonDropdown = toolbarFunction.call(pageForm.instance())
            .items.find((item) => item.label === 'Save');
        return saveButtonDropdown.options.find((option) => option.label === label);
    }

    const webspaceStore = require('../../../stores/WebspaceStore');
    const webspace = {
        key: 'sulu',
        localizations: [{locale: 'en', default: false}, {locale: 'de', default: true}],
        allLocalizations: [{localization: 'en', name: 'en'}, {localization: 'de', name: 'de'}],
    };
    const promise = Promise.resolve(webspace);
    webspaceStore.loadWebspace.mockReturnValue(promise);
    const withToolbar = require('sulu-admin-bundle/containers/Toolbar/withToolbar');
    const PageForm = require('../PageForm').default;
    const ResourceStore = require('sulu-admin-bundle/stores/ResourceStore').default;
    const toolbarFunction = withToolbar.mock.calls[0][1];
    const resourceStore = new ResourceStore('pages', 1, {locale: observable.box()});

    const router = {
        restore: jest.fn(),
        bind: jest.fn(),
        route: {
            options: {
                locales: true,
            },
        },
        attributes: {
            webspace: 'sulu',
            locale: 'de',
        },
    };

    const pageForm = mount(<PageForm router={router} resourceStore={resourceStore} />);
    pageForm.instance().formStore.locale.set('en');

    return promise.then(() => {
        pageForm.update();

        expect(getSaveItem('Save as draft').disabled).toBe(true);
        expect(getSaveItem('Save and publish').disabled).toBe(true);

        resourceStore.dirty = true;
        expect(getSaveItem('Save as draft').disabled).toBe(false);
        expect(getSaveItem('Save and publish').disabled).toBe(false);
    });
});

test('Should save form when submitted and redirect to editRoute when creating a new page', () => {
    const ResourceRequester = require('sulu-admin-bundle/services/ResourceRequester');
    ResourceRequester.put.mockReturnValue(Promise.resolve());
    const webspaceStore = require('../../../stores/WebspaceStore');
    const webspace = {
        key: 'sulu',
        localizations: [{locale: 'en', default: false}, {locale: 'de', default: true}],
        allLocalizations: [{localization: 'en', name: 'en'}, {localization: 'de', name: 'de'}],
    };
    const webspacePromise = Promise.resolve(webspace);
    webspaceStore.loadWebspace.mockReturnValue(webspacePromise);
    const PageForm = require('../PageForm').default;
    const ResourceStore = require('sulu-admin-bundle/stores/ResourceStore').default;
    const locale = observable.box();
    const resourceStore = new ResourceStore('pages', undefined, {locale: locale});
    const metadataStore = require('sulu-admin-bundle/containers/Form/stores/MetadataStore');

    const schemaTypesPromise = Promise.resolve({});
    metadataStore.getSchemaTypes.mockReturnValue(schemaTypesPromise);

    const schemaPromise = Promise.resolve({});
    metadataStore.getSchema.mockReturnValue(schemaPromise);

    const router = {
        navigate: jest.fn(),
        restore: jest.fn(),
        bind: jest.fn(),
        route: {
            options: {
                locales: true,
                editRoute: 'test_route',
            },
        },
        attributes: {
            webspace: 'sulu',
            locale: 'de',
            parentId: 'test-parent-id',
        },
    };

    const pageForm = mount(<PageForm router={router} resourceStore={resourceStore} />);
    pageForm.instance().formStore.save = jest.fn();
    const savePromise = Promise.resolve({id: 'newId'});
    pageForm.instance().formStore.save.mockImplementation(() => {
        resourceStore.id = 'newId';
        return savePromise;
    });

    resourceStore.locale.set('de');
    resourceStore.data = {value: 'Value'};
    resourceStore.loading = false;
    resourceStore.destroy = jest.fn();

    return Promise.all([webspacePromise, schemaTypesPromise, schemaPromise]).then(() => {
        pageForm.update();
        pageForm.find('Form').at(0).instance().props.onSubmit('publish');
        expect(resourceStore.destroy).toBeCalled();
        expect(pageForm.instance().formStore.save).toBeCalledWith(
            {
                action: 'publish',
                parent: 'test-parent-id',
                webspace: 'sulu',
            }
        );

        return savePromise.then(() => {
            pageForm.update();
            resourceStore.id = 'newId';
            expect(router.navigate).toBeCalled();
            expect(router.navigate.mock.calls[0][0]).toBe('test_route');
            const secondArgument = router.navigate.mock.calls[0][1];
            expect(secondArgument.locale).toBe(locale);
            expect(secondArgument.id).toBe('newId');
            expect(secondArgument.webspace).toBe('sulu');
        });
    });
});
