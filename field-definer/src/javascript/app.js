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
                if ( field.get('name') == "Description" || field.get('name') == "Notes" ) {
                    return false;
                }
                if ( field.get('fieldDefinition').attributeDefinition.AttributeType == "TEXT" ) {
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
        var me = this;
        var value_field = this.down('#field_values');
        var raw_value = value_field.getValue();
        
        var values = Ext.util.Format.trim(raw_value).split(/\n/);
        var unique_array = Ext.Array.unique(values);
        var type_name = this.down('#type_selector').getValue();
        var field_name = this.down('#field_selector').getValue();
        
        this.logger.log("_validateAndSave",field_name,unique_array);
        
        var key = this._getKeyName(type_name, field_name);
        this.logger.log('_validateAndSave key=' + key);
        var settings = {};
        settings[key] = Ext.JSON.encode(unique_array);
        
        Rally.data.PreferenceManager.update({
            workspace: this.getContext().getWorkspace(),
            settings: settings,
            success: function(){
                me.publish('choiceDefinerMessage', 'Choices saved');
            }
        });
    }
});