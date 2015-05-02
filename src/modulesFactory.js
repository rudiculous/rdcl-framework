"use strict";

const path = require('path');

const Router = require('koa-router');


/**
 * Creates a module initializer.
 *
 * @param {Function} attachModules The method that attaches the modules.
 * @param {String}   dirname       The directory where the modules are located.
 * @return {Function} The module initializer.
 */
exports = module.exports = function modulesFactory(attachModules, dirname) {

    return modules;


    /**
     * Initializes the modules.
     *
     * @param {koa} app The Koa application.
     */
    function modules(app) {
        const router = new Router();

        app.context.router = router;
        app.locals.url = function () {
            let url = router.url.apply(router, arguments);

            if (url instanceof Error) {
                app.logger.severe(url);
                return '';
            }
            else {
                return url;
            }
        };

        let context = {
            app,
            router,
            renderTemplate,
            TODO,
        };

        attachModules.call(context, use);

        app.use(function* (next) {
            Object.defineProperty(this.response, 'template', {
                enumerable: true,
                writable: true,
                configurable: true,
            });

            let _templateData = {};
            Object.defineProperty(this.response, 'templateData', {
                enumerable: true,
                get: function getTemplateData() {
                    return _templateData;
                },
                set: function setTemplateData(val) {
                    Object.keys(val).forEach(function (key) {
                        _templateData[key] = val[key];
                    });
                }
            });

            yield next;

            if (this.response.template != null && !this.response.body) {
                yield this.render(this.response.template, this.response.templateData);
            }
        });
        app.use(router.routes());
        app.use(router.allowedMethods());

        function use(module) {
            let args = Array.prototype.slice.call(arguments, 1);
            require(path.join(dirname, module)).apply(context, args);
        }

        function renderTemplate(template) {
            return function* () {
                this.response.template = template;
            };
        }
    }
};

function* TODO(next) {
    this.throw(501, 'Not yet implemented.');
}
