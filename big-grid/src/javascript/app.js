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
            type: 'HierarchicalRequirement',
            fetch: "FormattedID,Name",
            pageSize: 20
        }
    },
    logger: new Rally.technicalservices.Logger(),

    launch: function() {
        var me = this;
        var type = this.getSetting('type')
        this._getMultiFieldList(type).then({
            scope:this,
            success: function(){
                if (this.isExternal){
                    this.showSettings(this.config);
                } else {
                    this._loadSettingsIntoConfig();
                    this._makeAndDisplayGrid(type,config.pageSize,config.fetch,config.columns);
                }        
               
            },
            failure: function(){
                alert ('Error loading multi-select fields');
            }
        });
     },
    _getWorkspacePreferences: function(filter){
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.PreferenceManager.load({
          workspace: this.getContext().getWorkspace(), 
          additionalFilters: [{
                property:'Name',
                operator:'contains',
                value:filter
            }],
          scope: this,
          success: function(prefs) {
              this.logger.log("Workspace Preferences - success", prefs);
              deferred.resolve(prefs);
              },
          failure: function(){
              this.logger.log("failure");
              deferred.reject();
          }
            }); 
        return deferred;
    },

    _getMultiFieldList: function(model) {
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        this.multi_field_list = [];
        key = 'rally.techservices.fieldvalues.';
        this._getWorkspacePreferences(key).then({
                scope: this,
                success: function(prefs) {
                    var keys = Ext.Object.getKeys(prefs);
                     Ext.Array.each(keys, function(key){
                        var name_array = key.split('.');
                        var field_name = name_array[name_array.length - 1];
                        var model_name = name_array[name_array.length - 2];
                        if (name_array[name_array.length-3].toLowerCase() == 'portfolioitem'){
                            model_name = 'PortfolioItem/' + model_name;
                        }
                        if (model_name == model){
                            me.logger.log('Multi-select list add: ' +  key);
                            me.multi_field_list.push(field_name);
                        }
                     });
                     me.multi_field_list = me.multi_field_list.join(',');

                     deferred.resolve();
                }
        });
        return deferred.promise;
    },

    _makeAndDisplayGrid: function(type,pageSize,fetch, columns) {
        var me = this;
       // var type = this.getConfig('type');
        this.logger.log("_makeAndDisplayGrid",type,pageSize,fetch,this.config);
        var context = this.getContext();
//            pageSize = Number(this.getConfig('pageSize')),
//            fetch = this.getConfig('fetch');

        //this._getColumns(fetch);
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
            listeners: {
                scope:this,
                columnmove: this._onColumnMove
            },
            storeConfig: {
                fetch: fetch,
                models: type, //this.getConfig('type'),
                filters: this._getFilters(),
                pageSize: pageSize,
                sorters: Rally.data.util.Sorter.sorters(this.getConfig('order')),
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
                        
//                        var localPageSize = Number(me.getConfig('pageSize'));
//                        if (localPageSize != state.pageSize)
                        if (pageSize != state.pageSize)
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
    _onColumnMove: function(ct,column,fromIdx,toIdx){
      //reorder columns in updated order to preferences 
      this.logger.log('_onColumnMove');  
      var currentIdx =0, newIdx = 0;
      Ext.each(this.config.columns,function(cfgcol, idx, colary){
          if (cfgcol.dataIndex == column.dataIndex){
              currentIdx = idx;
              newIdx = currentIdx + (toIdx-fromIdx);
          }
      });
      if (currentIdx != newIdx){
          var movedCol = this.config.columns[currentIdx];
          this.config.columns.splice(newIdx,0,movedCol);
          if (newIdx < currentIdx){
              currentIdx = currentIdx + 1;
          }
          this.config.columns.splice(currentIdx,1);
         // this.saveSetting('fetch',this.config.columns);
          // this._saveConfig(this.config).then({

           this._saveConfigToSettings().then({
              scope: this,
              success: function() {
                  this.logger.log('Column reordering saved to: ', this.config.columns);
              }
          });
      }
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
            query_string = this.getConfig('query_string');
        filters = Ext.create('TSStringFilter',{query_string:query_string});
        return filters;
    },

    _isSchedulableType: function(type) {
        return _.contains(['hierarchicalrequirement', 'task', 'defect', 'defectsuite', 'testset'], type.toLowerCase());
    },

    _getFetchOnlyFields:function(){
        return ['LatestDiscussionAgeInMinutes'];
    },

//    _getColumns: function(fetch){
//        var me = this;
//        var columns = [];
//
////        if ( this.getSetting('columns') ) {
////            console.log('using setting', this.getSettings('columns'));
////            columns = this.getSetting('columns');
////        } else if (fetch) {
//          columns = Ext.Array.difference(fetch.split(','), this._getFetchOnlyFields());
////        }
//          
//          
//          
//        var xformed_columns = [];
//        Ext.each(columns, function(column){
//            xformed_columns.push(this._setRenderer(column,me));
//        },this);
//        
//        this.logger.log("Using column definitions",xformed_columns);
//        return xformed_columns;
//    },
//    _setRenderer: function(column,scope){
//        this.logger.log('_setRenderer', column, this.multi_field_list);
//        var data_index = column.dataIndex;
//        model = this.getSetting('type');
//        if (this.multi_field_list.length > 0){
//            var multi_array= this.multi_field_list.split(',');
//            console.log(multi_array);
//            if (Ext.Array.contains(multi_array,column)){
//                console.log('multi-select', column);
//                column = scope._getMultiSelectColumnConfig(model,column);
//            }
//        }
//        
//        if ( data_index == 'DerivedPredecessors' ) {
//            column = { 
//                text: 'Derived Predecessors',
//                xtype: 'templatecolumn', 
//                tpl: '--',
//                width: 200
//            };
//            column.renderer = function(value,metaData,record,row,col,store,view) {
//                var display_value = "";
//                var object_id = record.get('ObjectID');
//                var div_id = "DP"+ object_id;
//                
//                Ext.create('Rally.data.lookback.SnapshotStore',{
//                    autoLoad: true,
//                    fetch: ['Name','FormattedID'], //KC
//                    filters: [
//                        {property:'__At',value:'current'},
//                        {property:'_ItemHierarchy',value:object_id},
//                        {property:'Predecessors',operator:'!=',value:null}
//                    ],
//                    listeners: {
//                        scope: scope,
//                        load: function(store,records){
//                            var count = records.length || 0;
//                            var containers = Ext.query('#'+div_id);
//           
//                            if ( containers.length == 1 ){
//                        		containers[0].innerHTML = this._getDerivedPredecessorsContent(records); //count;
//                        		//Need to re-draw the grid here because the original content likely required less space than the new content so content may be cutoff
//                        		this.down('rallygrid').doLayout();
//                            }
//                        }
//                    }
//                });
//                return '<div id="' + div_id + '">loading</div>';
//            }
//        }  
//        console.log('column: ', column);
//        return column;
//    },
    _getDerivedPredecessorColumnConfig: function(){
        if ( data_index == 'DerivedPredecessors' ) {
            column = { 
                text: 'Derived Predecessors',
                xtype: 'templatecolumn', 
                tpl: '--',
                width: 200
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
                return '<div id="' + div_id + '">loading</div>';
            }
        }  
       return column;
    },
    _getMultiSelectColumnConfig: function(type_name, data_index, display_name){
        var multi_column_cfg = {
            dataIndex:data_index,
            text: display_name,
            editor: {
                xtype:'tsmultipicker',
                autoExpand: false,
                field_name:data_index,
                model: type_name
            }
        };
        return multi_column_cfg;
    },
    //Update what is populated in the custom Grid
    _getDerivedPredecessorsContent: function(records)
    {
        var story_names = '';
        if (records.length > 0){
            for (var i=0;i < records.length; i++){
                var link = "<a target='_blank' href='https://rally1.rallydev.com/#/detail/userstory/" + records[i].get('ObjectID') + "'>" + records[i].get('FormattedID')  + "</a>";
                story_names +=    link + ': ' + records[i].get('Name') +  '<br>';
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
//    _saveConfig: function(config) {
//        var me = this;
//        this.logger.log("new config",config);
//        delete config["config"];
//        delete config["context"];
//        delete config["settings"];
//        
//        me.logger.log('pageSize',config.pageSize);
//        var deferred = Ext.create('Deft.Deferred');
//        Rally.data.PreferenceManager.update({
//            appID: this.getAppId(),
//            filterByUser: true,
//            settings: { 
//                'rally.technicalservices.bigmulti.settings': Ext.JSON.encode(config)
//            },
//            success: function() {
//                me.logger.log("Saved settings",config);
//                deferred.resolve();
//            }
//        });
//        return deferred.promise;
//    },
//    
    // getConfig - we need this function to store the config locally so that we 
    //can run this in debug mode -- 
    getConfig: function(field){
        this.logger.log('getConfig',field,this.config)
        config = this.config;
        if ( config[field] ) {
            return config[field];
        }
        
        if ( config.defaultSettings[field] ) {
            return config.defaultSettings[field];
        }
        return null;
    },
    _filterOutTextFields: function(field){
        var attribute_defn = field.attributeDefinition;
        if ( ! attribute_defn ) {
            return false;
        }
        if ( attribute_defn.ElementName == "RevisionHistory" ) {
            return false;
        }
        if ( attribute_defn ) {
            var attribute_type = attribute_defn.AttributeType;

            if ( attribute_type == "TEXT" ) {
                return Ext.Array.contains(this.multi_field_list,field.name);
                return false;
            }
        } else {
            return false;
        }
        return true;
    },
    _filterInPossibleMultiFields: function(field){
        var attribute_defn = field.attributeDefinition;
        if ( field.name == "Description" || field.name == "Notes" ) {
            return false;
        }
        if ( attribute_defn ) {
            var attribute_type = attribute_defn.AttributeType;
            if ( attribute_type == "TEXT" ) {
                return true;
            }
        } else {
            return false;
        }
        return false;
   },
   _getColumnsFromFields: function(type,selected_fields_from_picker){
       
       var columns = [];

       Ext.each(selected_fields_from_picker, function(field){
           var name = field['name'];
           var display_name = field['displayName'];
           var column_def = {
                   dataIndex: name,
                   text: display_name
              };
           if (Ext.Array.contains(this.multi_field_list,name)){
               column_def = this._getMultiSelectColumnConfig(type,name,display_name);
           } else if (name == 'DerivedPredecessors'){
               column_def = this._getDerivedPredecessorsColumnConfig();
           }
           
           columns.push(column_def);
       }, this);
       
       return columns;
   },

   /********************************************
    /* Overrides for App class
    /*
    /********************************************/
    //getSettingsFields:  Override for App    
    getSettingsFields: function() {
        
        return [
            {
                name: 'type',
                xtype:'rallycombobox',
                displayField: 'DisplayName',
                storeConfig: {
                    model:'TypeDefinition',
                    filters: [
                      {property:'Creatable',value:true},
                      {property:'Restorable',value:true}
                    ]
                },
                fieldLabel: 'Artifact Type',
                labelWidth: 100,
                labelAlign: 'left',
                minWidth: 200,
                margin: 10,
                valueField:'TypePath',
                bubbleEvents: ['select','ready'],
                readyEvent: 'ready'
            },{
            name: 'fetch',
            xtype: 'rallyfieldpicker',
           // modelTypes: ['HierarchicalRequirement'],
            labelWidth: 100,
            fieldLabel: 'Columns',
            labelAlign: 'left',
            minWidth: 200,
            margin: 10,
            autoExpand: false,
            alwaysExpanded: false,
            handlesEvents: { 
                select: function(cb) {
                    //this = this rally field picker 
                    this.modelTypes = [cb.value];
                    this.refreshWithNewContext(this.context);
                },
                ready: function(cb){
                    this.modelTypes = [cb.value];
                    this.refreshWithNewContext(this.context);
                    
                }
            },
            readyEvent: 'ready'
        },{
            name: 'pageSize',
            xtype:'numberfield',
            labelAlign: 'left',
            labelWidth: 100,
            minWidth: 50,
            margin: 10,
            fieldLabel:'Default Page Size',
            minValue: 5,
            maxValue: 1000,
            step: 25
        },{
            name: 'query_string',
            xtype:'textareafield',
            width: 300,
            margin:'30,0,0,0',
            grow: true,
            labelAlign: 'top',
            fieldLabel:'Limit to items that currently meet this query filter:'
        }];
    },
    isExternal: function(){
      return typeof(this.getAppId()) == 'undefined';
    },
    //showSettings:  Override
    showSettings: function(options) {      
        this._appSettings = Ext.create('Rally.app.AppSettings', Ext.apply({
            fields: this.getSettingsFields(),
            settings: this.getSettings(),
            defaultSettings: this.getDefaultSettings(),
            context: this.getContext(),
            settingsScope: this.settingsScope,
            autoScroll: true
        }, options));
        
        this._appSettings.on('cancel', this._hideSettings, this);
        this._appSettings.on('save', this._onSettingsSaved, this);
        if (this.isExternal()){
            if (this.down('#settings_box').getComponent(this._appSettings.id)==undefined){
                this.down('#settings_box').add(this._appSettings);
            }
        } else {
            this.hide();
            this.up().add(this._appSettings);
        }
        return this._appSettings;
    },
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        //Build and save column settings...this means that we need to get the display names and multi-list
        this.logger.log('onSettingsUpdate',settings);
        
        var type = this.getSetting('type');
        var pageSize = Number(this.getSetting('pageSize'));
        var fetch = this.getSetting('fetch').join(',');
        var query_string = this.getSetting('query_string');
        
        this._getFieldsFromFetch(type,fetch).then({
            scope: this,
            success: function(fields){
                columns = this._getColumnsFromFields(type,fields);
                this._loadSettingsIntoConfig(); 
                this.config.columns = columns; 
                this._saveConfigToSettings().then({
                    scope:this,
                    success: function(){
                        this._makeAndDisplayGrid(type,pageSize,fetch, columns);
                    },
                    failure: function(){
                        alert('Error saving Settings');
                    }
                
                });
             },
            failure: function(){
                alert('Error loading fields from grid.');
            }
        });
    },
    _loadSettingsIntoConfig: function(){
        
        this.config.fetch = this.getSetting('fetch').join(',');
        this.config.type = this.getSetting('type');
        this.config.pageSize = Number(this.getSetting('pageSize'));
        this.config.query_string =  this.getSetting('query_string');
        this.config.columns = Ext.JSON.decode(this.getSetting('columns'));
        console.log('columns decode',this.config.columns);
    },
    _saveConfigToSettings: function(){
        var deferred = Ext.create('Deft.Deferred');
        
        this.updateSettingsValues({
            scope:this,
            settings: {
                fetch: this.config.fetch,
                type: this.config.type,
                pageSize: this.config.pageSize,
                query_string:this.config.query_string,
                columns: Ext.JSON.encode(this.config.columns)
            },                    
            success: function(){
                deferred.resolve();
            },
            failure: function(){
                deferred.reject();
            }
        });
        return deferred.promise; 
    },
    _getFieldsFromFetch: function(type,fetch){
        var deferred = Ext.create('Deft.Deferred');

        fetch_array = Ext.Array.difference(fetch.split(','), this._getFetchOnlyFields());
        Rally.data.ModelFactory.getModel({
            type: type,
            scope: this,
            success: function(model) {
                var ret_fields = [];
                fields = model.getFields();
                Ext.Array.each(fields,function(field){
                    if (Ext.Array.contains(fetch_array,field.name)){
                        ret_fields.push(field);
                    }
                },this);
                deferred.resolve(ret_fields);
            },
            failure: function(){
                alert('There was an error loading the fields for the ' + type);
                deferred.reject();
            }
        });
        return deferred.promise;
    }
});
