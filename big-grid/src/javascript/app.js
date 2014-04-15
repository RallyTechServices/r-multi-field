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

    launch: function() {
        var me = this;

        var i_am_an_admin = Rally.environment.getContext().getPermissions().isWorkspaceOrSubscriptionAdmin();
        this.logger.log("Am I an admin: ", i_am_an_admin);
        
        Rally.data.PreferenceManager.load({
            appID: this.getAppId(),
            filterByUser: true,
            success: function(prefs) {
                me.logger.log("got prefs ", prefs);
                var key = "rally.technicalservices.bigmulti.settings";
                if ( prefs && prefs[key] ) {
                    me.config = Ext.JSON.decode(prefs[key]);
                }
                me.logger.log("config is now ", me.config);
                
                me._getMulitFieldList();
                
                if (i_am_an_admin) {
                    me.down('#settings_box').add({
                        xtype: 'rallybutton',
                        text: 'Settings',
                        handler: function() {
                            me._showSettingsDialog();
                        },
                        scope: me
                    });
                }
                
                me._makeAndDisplayGrid();
            }
        });

        
        
    },
    _getMulitFieldList: function() {
        var me = this;
        //var key = 'rally.techservices.fieldvalues.' + field_name;
        var key = 'rally.techservices.biggrid.fieldvalues.';
        this.multi_field_list = [];
        
        Rally.data.PreferenceManager.load({
            workspace: this.getContext().getWorkspace(),
            additionalFilters: [{
                property:'Name',
                operator:'contains',
                value:key
            }],
            success: function(prefs) {
                me.logger.log("prefs",prefs);
                if ( prefs ) {
                    Ext.Object.each(prefs,function(name,value){
                        var name_array = name.split('.');
                        var field_name = name_array[name_array.length - 1];
                        me.multi_field_list.push(field_name);
                    });
                }
            }
        });
    },
    _makeAndDisplayGrid: function() {
        var me = this;
        this.logger.log("_makeAndDisplayGrid",this.config);
        var context = this.getContext(),
            pageSize = Number(this.getSetting('pageSize')),
            fetch = this.getSetting('fetch'),
            columns = this._getColumns(fetch);

        if ( this.down('rallygrid') ) {  
            this.logger.log("_makeAndDisplayGrid: destroying previous grid");        	
            this.down('rallygrid').destroy();
        }

        var pageSizeOptions = this._setPageSizeOptions(pageSize);
        this.logger.log("pageSizes", pageSizeOptions);
        
        this.down('#grid_box').add({
            xtype: 'rallygrid',
            id: 'biggrid',
            columnCfgs: columns,
            enableColumnHide: false,
            enableRanking: false,
            enableBulkEdit: true,
            autoScroll: true,
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
                scope: me,
            	stateful: true,
                stateId: 'rally-techservices-biggrid-toolbar',
                stateEvents: ['change'],
                pageSizes: pageSizeOptions,
                listeners: {
                    change: function(toolbar,pageData) {
                        me.logger.log('change',pageData);
                    },
                    statesave: function(toolbar,state){
                        me.logger.log('statesave',state);
                    },
                    
                    
                    staterestore: function(toolbar,state){
                        me.logger.log('staterestore',state);
                        var store = this.getStore();
                        if ( store ) {
                        	if ( state && state.currentPage ) {
                        		me.logger.log('staterestore', state.currentPage);
                                store.currentPage = state.currentPage;
                            }
                            if ( state && state.pageSize ) {
                                store.pageSize = state.pageSize;
                            }
                        }
                    },
                    
                    //Use the beforestaterestore function to set the pagesizes so that they don't 
                    //get overwritten when the staterestore event fires
                    beforestaterestore: function(toolbar, state)
                    {
                    	
                    	var localPageSize = Number(me.getSetting('pageSize'));
                    	if (localPageSize != state.pageSize)
                    		{
                    			state.pageSizes = this.pageSizes;
                    			state.pageSize = pageSize;
                    			state.currentPage = 1; 
                    		};
                    }
                },
                getState: function() {
                    return this._getPageData();
                }
            }
        });
    },
    
    //Determines the default page size options based on the default page size
    _setPageSizeOptions: function (defaultPageSize)
    {
    	var pageSizes = [defaultPageSize,defaultPageSize*2,defaultPageSize*4,defaultPageSize*8,defaultPageSize*20];
    	return pageSizes;
    },
    
    
    _loaded: function(store,records) { 
        this.logger.log("Data Loaded",records);

    },

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
        var me = this;
        var columns = [];
        if ( this.getSetting('columns') ) {
            columns = this.getSetting('columns');
        } else if (fetch) {
            columns = Ext.Array.difference(fetch.split(','), this._getFetchOnlyFields());
        }
        
        var xformed_columns = [];
        Ext.Array.each(columns, function(column){
            xformed_columns.push(me._setRenderer(column,me));
        });
        
        this.logger.log("Using column definitions",xformed_columns);
        return xformed_columns;
    },
    _setRenderer: function(column,scope){
        var data_index = column.dataIndex;
        
        if ( data_index == 'DerivedPredecessors' ) {
            column = { 
                text: 'Derived Predecessors',
                xtype: 'templatecolumn', 
                tpl: '--'
            };
            column.renderer = function(value,metaData,record,row,col,store,view) {
                var display_value = "";
                var object_id = record.get('ObjectID');
                var div_id = "DP"+ object_id;
                
                Ext.create('Rally.data.lookback.SnapshotStore',{
                    autoLoad: true,
                    fetch: ['Name','FormattedID'], //KC
                    filters: [
                        {property:'__At',value:'current'},
                        {property:'_ItemHierarchy',value:object_id},
                        {property:'Predecessors',operator:'!=',value:null}
                    ],
                    listeners: {
                        scope: scope,
                        load: function(store,records){
                            var count = records.length || 0;
                            var containers = Ext.query('#'+div_id);
                            
                            
                            if ( containers.length == 1 ){
                        		containers[0].innerHTML = this._getDerivedPredecessorsContent(records); //count;
                        		//Need to re-draw the grid here because the original content likely required less space than the new content so content may be cutoff
                        		this.down('rallygrid').doLayout();
                        		
                            }
                        }
                    }
                });
//                value = record.get('Predecessors');
//                if ( typeof value.Count !== 'undefined' ) {
//                    display_value = value.Count;
//                }
                return '<div id="' + div_id + '">loading</div>';
            }
        }
        return column;
    },
    
    //Update what is populated in the custom Grid
    _getDerivedPredecessorsContent: function(records)
    {
    	var story_names = '';
    	if (records.length > 0){
    		for (var i=0;i < records.length; i++)
    			{
    			story_names +=  records[i].get('FormattedID')   + ': ' + records[i].get('Name') +  '<br>';
    	        this.logger.log ('recordassociations', records[i].getAssociatedData);
    			};
    	}
    	return story_names; 
    
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
        var config = this.config;
        this.dialog = Ext.create('Rally.technicalservices.SettingsDialog',{
            type: this.getSetting('type'),
            query_string: this.getSetting('query_string'),
            multi_field_list: this.multi_field_list,
            fetch_list: this.getSetting('fetch'),
            pageSize: this.getSetting('pageSize'),
            listeners: {
                settingsChosen: function(dialog,returned_config) {
                    var me = this;
                    this.config = Ext.Object.merge(config,returned_config);
                    this.logger.log("returned_config", returned_config);
                    this._saveConfig(this.config).then(
                    {
                    	scope:this, 
                    	success: this._makeAndDisplayGrid
                    });
                },
                scope: this
            }
        });
        this.dialog.show();
    },
    _saveConfig: function(config) {
        var me = this;
        this.logger.log("new config",config);
        delete config["config"];
        delete config["context"];
        delete config["settings"];
        
        me.logger.log('pageSize',config.pageSize);
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.PreferenceManager.update({
            appID: this.getAppId(),
            filterByUser: true,
            settings: { 
                'rally.technicalservices.bigmulti.settings': Ext.JSON.encode(config)
            },
            success: function() {
                me.logger.log("Saved settings",config);
                deferred.resolve();
            }
        });
        return deferred.promise;
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
});