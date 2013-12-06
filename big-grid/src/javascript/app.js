(function() {
    var Ext = window.Ext4 || window.Ext;
    var appAutoScroll = Ext.isIE7 || Ext.isIE8;
    var gridAutoScroll = !appAutoScroll;

    Ext.define('CustomApp', {
        extend: 'Rally.app.App',

        requires: [
            'Rally.data.util.Sorter',
            'Rally.data.wsapi.Filter',
            'Rally.ui.grid.Grid',
            'Rally.data.ModelFactory',
            'Rally.ui.grid.plugin.PercentDonePopoverPlugin'
        ],

        items: [
            { xtype:'container',itemId:'settings_box',margin: 10 },
            { xtype:'container', itemId:'grid_box',margin: 10 }
        ],
        config: {
            defaultSettings: {
                type: 'hierarchicalrequirement',
                fetch: "FormattedID,Name",
                pageSize: 20
            }
        },
        logger: new Rally.technicalservices.Logger(),

        autoScroll: appAutoScroll,

        launch: function() {
            var me = this;
            
            this.down('#settings_box').add({
                xtype: 'rallybutton',
                text: 'Settings',
                handler: function() {
                    me._showSettingsDialog();
                },
                scope: me
            });
            
            this._makeAndDisplayGrid();
            
        },
        
        _makeAndDisplayGrid: function() {
            this.logger.log("_makeAndDisplayGrid",this.config);
            var context = this.getContext(),
                pageSize = this.getSetting('pageSize'),
                fetch = this.getSetting('fetch'),
                columns = this._getColumns(fetch);

            if ( this.down('rallygrid') ) {
                this.down('rallygrid').destroy();
            }
            
            this.down('#grid_box').add({
                xtype: 'rallygrid',
                columnCfgs: columns,
                enableColumnHide: false,
                enableRanking: false,
                enableBulkEdit: true,
                autoScroll: gridAutoScroll,
                plugins: this._getPlugins(columns),
                storeConfig: {
                    fetch: fetch,
                    models: this.getSetting('type'),
                    filters: this._getFilters(),
                    pageSize: pageSize,
                    sorters: Rally.data.util.Sorter.sorters(this.getSetting('order')),
                    listeners: {
                        load: this._loaded,
                        scope: this
                    }
                },
                pagingToolbarCfg: {
                    pageSizes: [pageSize, 50, 100, 200, 1000]
                }
            });
        },
        
        _loaded: function() { },

        _getFilters: function() {
            var filters = [],
                query_string = this.getSetting('query_string');
            filters = Ext.create('TSStringFilter',{query_string:query_string});
            return filters;
        },

        _isSchedulableType: function(type) {
            return _.contains(['hierarchicalrequirement', 'task', 'defect', 'defectsuite', 'testset'], type.toLowerCase());
        },

        _getFetchOnlyFields:function(){
            return ['LatestDiscussionAgeInMinutes'];
        },

        _getColumns: function(fetch){
            if ( this.columns ) {
                return this.columns;
            }
            if (fetch) {
                return Ext.Array.difference(fetch.split(','), this._getFetchOnlyFields());
            }
            return [];
        },

        _getPlugins: function(columns) {
            var plugins = [];

            if (Ext.Array.intersect(columns, ['PercentDoneByStoryPlanEstimate','PercentDoneByStoryCount']).length > 0) {
                plugins.push('rallypercentdonepopoverplugin');
            }

            return plugins;
        },
        _showSettingsDialog: function() {
            if ( this.dialog ) { this.dialog.destroy(); }
            this.logger.log("old config",this.getSettings());
            var config = this.config;
            
            //this.showSettings();
            this.dialog = Ext.create('Rally.technicalservices.SettingsDialog',{
                type: this.getSetting('type'),
                query_string: this.getSetting('query_string'),
                listeners: {
                    settingsChosen: function(dialog,returned_config) {
                        this.config = Ext.Object.merge(config,returned_config);

                        this.logger.log("new config",returned_config,this.config);
                        this._makeAndDisplayGrid();
                    },
                    scope: this
                }
            });
            this.dialog.show();
        },
        // override until we figure out problem with getSettingsFields
        getSetting: function(field){
            config = this.config;
            if ( config[field] ) {
                return config[field];
            }
            if ( config.defaultSettings[field] ) {
                return config.defaultSettings[field];
            }
            return null;
        }
//        getSettingsFields: function() {
//            var model_filters = [{property:'ElementName',value:'Defect'},
//                {property:'ElementName',value:'HierarchicalRequirement'}];
//            var store = Ext.create('Rally.data.wsapi.Store',{
//                model:'TypeDefinition',
//                filters: [Rally.data.wsapi.Filter.or(model_filters)],
//                autoLoad: false
//            });
//            return [
//                { 
//                    name: 'type',
//                    xtype: 'rallycombobox',
//                    valueField: 'ElementName',
//                    store: store,
//                    /*storeConfig: {
//                        model:'TypeDefinition',
//                        filters: [Rally.data.wsapi.Filter.or(model_filters)],
//                        autoLoad: false
//                    },*/
//                    readyEvent: 'ready' //event fired to signify readiness
//                }
//            ];
//        }
    });
})();