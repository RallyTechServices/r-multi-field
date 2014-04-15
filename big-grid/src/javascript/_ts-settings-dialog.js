Ext.define('Rally.technicalservices.SettingsDialog',{
    extend: 'Rally.ui.dialog.Dialog',
    alias: 'widget.tssettingsdialog',
    config: {
        /* default settings. pass new ones in */
        title: 'Settings',
        type: 'HierarchicalRequirement',
        /**
         * artifact_types
         * [ @type ] artifact_types This is the list of items allowed in the model chooser drop down
         */
        artifact_types: [
            {Name:'UserStory',Value:'hierarchicalrequirement'},
            {Name:'Defect',Value:'Defect'},
            {Name:'Release',Value:'Release'}
        ],
        /**
         * A string to apply to choose records that are allowed in the calculations --
         * this query is applied to items as they exist now, and then all the calculations are
         * about only those records as they were during the time period.  
         * 
         * This can make everything slow, because it adds a WsapiCall on top of the LookBack calls
         */
         query_string: null,
         /**
          * A string array of names of fields that are multiselect enabled
          * [@String] fields 
          */
         multi_field_list: [],
         /**
          * A string array of names of fields that were chosen for fetching (the
          * columns already picked)
          * 
          * [@String] 
          */
         fetch_list: [], 
         /**
          * 
          * pageSize
          * 
          */
          pageSize: 16
    },
    items: {
        xtype: 'panel',
        border: false,
        defaults: {
            padding: 5,
            margin: 5
        },
        items: [
            {
                xtype: 'container',
                itemId: 'model_selector_box'
            },
            {
                xtype:'container',
                itemId: 'column_selector_box',
                height: 80
            },
            {
                xtype:'container',
                itemId: 'multichoice_column_selector_box',
                height: 80
            },
            {
                xtype:'container',
                itemId:'query_selector_box'
            },
            {
            	xtype:'container',
            	itemId: 'page_size_selector_box'
            }
        ]
    },
    logger: new Rally.technicalservices.Logger(),
    
    constructor: function(config){
        this.mergeConfig(config);
        this.callParent([this.config]);
    },
    initComponent: function() {
        this.callParent(arguments);
        this.addEvents(
            /**
             * @event settingsChosen
             * Fires when user clicks done after making settings choices
             * @param {Rally.technicalservices.SettingsDialog} this
             * @param {hash} config settings
             */
            'settingsChosen',
            /**
             * @event cancelChosen
             * Fires when user clicks the cancel button
             */
            'cancelChosen'
        );

        this._buildButtons();
        this._addChoosers();

    },
    _buildButtons: function() {
        this.down('panel').addDocked({
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '0 0 10 0',
            layout: {
                type: 'hbox',
                pack: 'center'
            },
            ui: 'footer',
            items: [
                {
                    xtype: 'rallybutton',
                    text: 'Save',
                    scope: this,
                    userAction: 'clicked done in dialog',
                    handler: function() {
                        this.fireEvent('settingsChosen', this, this._getConfig());
                        this.close();
                    }
                },
                {
                    xtype: 'rallybutton',
                    text: 'Cancel',
                    handler: function() {
                        this.fireEvent('cancelChosen');
                        this.close()
                    },
                    scope: this
                }
            ]
        });
    },
    _getConfig: function() {
        var me = this;
        var config = {};
        if ( this.down('#model_chooser') &&  this.down('#model_chooser').getRecord() ) {
            config.type = this.down('#model_chooser').getRecord().get('TypePath');
        }
        var columns = [];
        var fetch = [];
            
        if ( this.down('#column_chooser') ) {
            var fields = this.down('#column_chooser').getValue();
            Ext.Array.each(fields,function(field){
                if ( Ext.Array.contains(me.multi_field_list,field.get('name') ) ) {
                    columns.push({
                        dataIndex:field.get('name'),
                        text: field.get('displayName'),
                        editor: {
                            xtype:'tsmultipicker',
                            autoExpand: true,
                            field_name:field.get('name')
                        }
                    });
                } else {
                    columns.push(me._getColumnFromField(field)); 
                }
                fetch.push(field.get('name'));
            });
        }
        if ( this.down('#multichoice_column_chooser') ) {
            var fields = this.down('#multichoice_column_chooser').getValue();
            Ext.Array.each(fields,function(field){
                columns.push({
                    dataIndex:field.get('name'),
                    text: field.get('displayName'),
                    editor: {
                        xtype:'tsmultipicker',
                        field_name:field.get('name')
                    }
                });
                fetch.push(field.get('name'));
            });
        }

        config.columns = columns;
        config.fetch = fetch.join(',');
            
        if ( this.down('#query_chooser') ) {
            config.query_string = this.down('#query_chooser').getValue();
        }
       
        config.pageSize = this.down('#page_size_chooser').getValue();
        me.logger.log('ts-settings-dialog._getConfig', me.pageSize);
        return config;
    },
    _getColumnFromField: function(field){
        var name = field.get('name');
        var column_def = {
            dataIndex:name,
            text: field.get('displayName')
        };
        return column_def;
    },
    _addChoosers: function() {
        var me = this;
        this._addModelChooser();
        this._addColumnChooser();
        this._addMultiChoiceColumnChooser();
        this._addQueryChooser();
        this._addPageSizeChooser();
        
    },
    _addModelChooser: function() {
        var me = this;
        var type_store = Ext.create('Rally.data.custom.Store',{
            data: me.artifact_types
        });
        me.logger.log('_addModelChooser:type', me.type);
        this.down('#model_selector_box').add({
            xtype:'rallycombobox',
            itemId: 'model_chooser',
            /*displayField: 'Name',
            valueField: 'Value',
            store: type_store,*/
            storeConfig: {
                autoLoad: true,
                model:'TypeDefinition',
                filters: [
                  {property:'Creatable',value:true},
                  {property:'Restorable',value:true}
                ]
            },
            fieldLabel: 'Artifact Type',
            labelWidth: 75,
            valueField:'TypePath',
            value: me.type,
            listeners: {
                scope: this,
                select: function(cb,new_value){
                    this.type = cb.getRecord().get('TypePath');
                    this._addColumnChooser();
                    //this._addMultiChoiceColumnChooser();
                }
            }
        });
    },
    _addColumnChooser: function() {
        var me = this;
        this.down('#column_selector_box').removeAll();
        var cb = this.down('#column_selector_box').add({
            alwaysExpanded: true,
            xtype: 'rallyfieldpicker',
            id: 'big_grid_field_picker',
            autoExpand: true,
            multi_field_list: this.multi_field_list,
            modelTypes: [me.type],
            itemId: 'column_chooser',
            labelWidth: 75,
            fieldLabel: 'Columns',
            ts_field_filter: this._filterOutTextFields,
            value:this.fetch_list
        });
    },
    _addMultiChoiceColumnChooser: function() {
        var me = this;
        
        this.down('#multichoice_column_selector_box').removeAll();
        var cb = this.down('#multichoice_column_selector_box').add({
            xtype: 'rallyfieldpicker',
            autoExpand: false,
            modelTypes: [me.type],
            itemId: 'multichoice_column_chooser',
            labelWidth: 75,
            fieldLabel: 'Multi-select Columns',
            ts_field_filter: this._filterInPossibleMultiFields
        });
    },
    _addQueryChooser: function() {
        var me = this;
        this.down('#query_selector_box').add({
            xtype:'textareafield',
            grow: true,
            itemId:'query_chooser',
            labelAlign: 'top',
            fieldLabel:'Limit to items that currently meet this query filter',
            value: me.query_string 
        });
    },
    _addPageSizeChooser: function(){
    	var me = this;
        this.down('#page_size_selector_box').add({
                xtype:'numberfield',
                itemId:'page_size_chooser',
                labelAlign: 'top',
                fieldLabel:'Default Page Size',
                value: me.pageSize,
                min: 1,
                max: 1000
            });
    },
    _dateValidator: function(value) {
        return true;
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
    }
    
});