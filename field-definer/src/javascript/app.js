Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    logger: new Rally.technicalservices.logger(),
    items: [
        {xtype:'container',itemId:'message_box'},
        {xtype:'container',itemId:'selector_box', padding: 5, margin: 5}, 
//        , items: [
//            {
//                fieldLabel: 'MultiSelect Type',
//                xtype: 'rallycombobox',
//                displayField: 'DisplayName',
//                model: 'TypeDefinition',
//                itemId: 'type_selector',
//                    storeConfig: {
//                        autoLoad: true,
//                        model:'TypeDefinition',
//                        filters: [
//                                  {property:'Creatable',value:true},
//                                  {property:'Restorable',value:true}
//                         ]
//                    },
//                    fieldLabel: 'Artifact Type',
//                    valueField:'TypePath',
//                    value: this.type
//            },
//            {
//                fieldLabel: 'MulitiSelect Field', 
//                xtype:'rallyfieldcombobox', 
//                model: 'UserStory', 
//                itemId: 'field_selector'
//            },
//            {
//                xtype:'textareafield',
//                fieldLabel: 'Valid Values',
//                itemId:'field_values'
//            }
//        ]},
        {xtype:'container',itemId:'button_box',padding: 5, margin: 5, items: [
            {xtype:'rallybutton',text:'Save',margin:5,itemId:'save_button'},
            {xtype:'rallybutton',text:'Reset',margin:5,itemId:'reset_button'}
        ]},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        var me = this;
       // var field_store = this.down('#field_selector').getStore();
      //  field_store.on('load',this._filterOutExceptText,this);
      //  this.down('#field_selector').on('change',this._getExistingChoices,this);
        this._addTypeSelector();
        //Set the type selector
        var init_type = 'User Story';
        this.down('#type_selector').setValue(init_type);
        this._addFieldSelector(init_type);
        this.down('#save_button').on('click',me._validateAndSave,me);
    },
   _addTypeSelector: function(){
       if (this.down('#type_selector') && this.down('#type_selector') != undefined){
           this.down('#type_selector').destroy();
       }
       
       this.down('#selector_box').add({
           fieldLabel: 'MultiSelect Type',
           xtype: 'rallycombobox',
           displayField: 'DisplayName',
           model: 'TypeDefinition',
           itemId: 'type_selector',
               storeConfig: {
                   autoLoad: true,
                   model:'TypeDefinition',
                   filters: [
                             {property:'Creatable',value:true},
                             {property:'Restorable',value:true}
                    ]
               },
               fieldLabel: 'Artifact Type',
               valueField:'TypePath',
               value: this.type
       });
       this.down('#type_selector').on('select',this._typeSelected,this);
       
   },
   _addFieldSelector: function(model){
       if (this.down('#field_selector') && this.down('#field_selector') != undefined){
           this.down('#field_selector').destroy();
           this.down('#field_values').destroy();
       }
       
       this.down('#selector_box').add(
       {
           fieldLabel: 'MulitiSelect Field', 
           xtype:'rallyfieldcombobox', 
           model: model, 
           itemId: 'field_selector',
           scope: this,
           listeners: {
               scope: this, 
               change: this._getExistingChoices
           }
       });
       var field_store = this.down('#field_selector').getStore();
       field_store.on('load',this._filterOutExceptText,this);
       
       this.down('#selector_box').add(
       {
           xtype:'textareafield',
           fieldLabel: 'Valid Values',
           itemId:'field_values'
       });       
   },
    _typeSelected: function(cb, records){
        var type_name = cb.getValue();
        this.logger.log(type_name);
        this._addFieldSelector(type_name);
    },
    _filterOutExceptText: function(store,records) {
        store.filter([{
            filterFn:function(field){ 
                var valid = false;
                if ( field.get('name') == "Description" || 
                        field.get('name') == "Notes" || 
                        field.get('name') == "Name") {
                    return false;
                }
                var field_def= field.get('fieldDefinition');
                if (field_def.attributeDefinition.Constrained == true){
                    return false;
                }
                if (field_def.attributeDefinition.ReadOnly == true){
                    return false;
                }
                if ( field.get('fieldDefinition').attributeDefinition.AttributeType == "STRING" || 
                        field.get('fieldDefinition').attributeDefinition.AttributeType == "TEXT") {
                    valid = true;
                }
                return valid;
            } 
        }]);
        this.down('#field_selector').setValue(store.getAt(1));
    },
    _getExistingChoices: function(){
        var me = this;
        this.logger.log('_getExistingChoices');
        this.down('#field_values').setValue('');
        
        var type_name = this.down('#type_selector').getValue();
        var field_name = this.down('#field_selector').getValue();
        
        var key = this._getKeyName(type_name, field_name);
        
        Rally.data.PreferenceManager.load({
            workspace: this.getContext().getWorkspace(),
            filterByName: key,
            success: function(prefs) {
                me.logger.log("prefs",prefs);
                if ( prefs && prefs[key] ) {
                    var values = Ext.JSON.decode(prefs[key]);
                    me.logger.log(values);
                    me.down('#field_values').setValue(values.join('\r\n'));
                }
            }
        });
    },
    _getKeyName: function(type_name,field_name){
        //May need to update typename to remove /
        type_name = type_name.replace("/",".");
        return 'rally.techservices.fieldvalues.' + type_name + '.' + field_name;
        //return 'rally.techservices.fieldvalues.' + field_name;
    },
    _validateAndSave: function() {
        this.logger.log("_validateAndSave",field_name,unique_array);

        var me = this;
        var value_field = this.down('#field_values');
        var raw_value = value_field.getValue();
        
        var values = Ext.util.Format.trim(raw_value).split(/\n/);
        var unique_array = Ext.Array.unique(values);
        var type_name = this.down('#type_selector').getValue();
        var field_name = this.down('#field_selector').getValue();
        var field_record = this.down('#field_selector').getRecord();
        
        //validate that if the field is a string field, that the contents of the box together does not exceed the string length
        //Since we are just showing a warning, we aren't capturing the return value.  
        this._validateField(field_record, raw_value);
        
        var key = this._getKeyName(type_name, field_name);
        this.logger.log('_validateAndSave key=' + key);
        var settings = {};
        settings[key] = Ext.JSON.encode(unique_array);
        
        Rally.data.PreferenceManager.update({
            workspace: this.getContext().getWorkspace(),
            settings: settings,
            scope:this,
            success: function(updatedRecords,notUpdatedRecord,options){
                me.logger.log('success',me.getContext().getWorkspace(), updatedRecords,notUpdatedRecord,options);
                if (notUpdatedRecord.length > 0){
                    //We need to intervene and save directly 
                    me.logger.log('PreferenceManager update did not work;  Saving preferences directly.');
                    me._savePrefs(key, settings[key]).then({
                        failure: function(){
                            Rally.ui.notify.Notifier.showWarning({ message: 'Options not saved to Preferences.' });
                        }
                    });
                } else {
                    Rally.ui.notify.Notifier.show({ message: 'Options Saved to Preferences.' });
                }
                
                
            }
        });
    },
    _savePrefs: function(key,value){
        var deferred = Ext.create('Deft.Deferred');
        
        Ext.create('Rally.data.WsapiDataStore', {
            model: 'Preference',
            //context: {workspace: this.getContext().getWorkspace()},
            fetch: ['ObjectID','Name','Value','CreationDate'],
            sorters: [ { property: 'Name', direction: 'ASC' }],
            autoLoad: true,
            scope: this,
            filters: [ { property: 'Name', operator: '=', value: key }],
            listeners: {
                load: function(store,data,success) {
                    if (success && data && data.length == 1){
                        console.log('success',data);
                        data[0].set('Value',value);
                        data[0].save();
                        deferred.resolve();   
                    } else {
                        deferred.reject();  
                    }
                },
                update: function(store,record,operation,modifiedFieldNames){
                    Rally.ui.notify.Notifier.show({ message: 'Options Saved to Preferences.' });

                }
            }
        });
        return deferred;
    },
    _validateField: function(field, values){

        this.logger.log('_validateField');
        var attr_def = field.get('fieldDefinition').attributeDefinition;
        this.logger.log('MaxLength=' + attr_def.MaxLength + ' Length Required:' + values.length);
        if (values.length > attr_def.MaxLength){
            var str = "The length of all valid values (" + attr_def.MaxLength + ") exceeds the max length of the field (" + values.length + ").\nIt is possible that the field values will not be saved properly if the selected options exceed the max length of the field.";
           alert (str);
            return false;
        }
        return true;
    }
});