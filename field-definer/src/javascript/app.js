Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    logger: new Rally.technicalservices.logger(),
    items: [
        {xtype:'container',itemId:'message_box'},
        {xtype:'container',itemId:'selector_box', padding: 5, margin: 5, items: [
            {
                fieldLabel: 'MulitiSelect Field', 
                xtype:'rallyfieldcombobox', 
                model: 'UserStory', 
                itemId: 'field_selector'
            },
            {
                xtype:'textareafield',
                fieldLabel: 'Valid Values',
                itemId:'field_values'
            }
        ]},
        {xtype:'container',itemId:'button_box',padding: 5, margin: 5, items: [
            {xtype:'rallybutton',text:'Save',margin:5,itemId:'save_button'},
            {xtype:'rallybutton',text:'Reset',margin:5,itemId:'reset_button'}
        ]},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        var me = this;
        var field_store = this.down('#field_selector').getStore();
        field_store.on('load',this._filterOutExceptText,this);
        this.down('#field_selector').on('change',this._getExistingChoices,this);
        this.down('#save_button').on('click',me._validateAndSave,me);
    },
    _filterOutExceptText: function(store,records) {
        store.filter([{
            filterFn:function(field){ 
                return field.get('fieldDefinition').attributeDefinition.AttributeType == "TEXT";
            } 
        }]);
        this.down('#field_selector').setValue(store.getAt(1));
    },
    _getExistingChoices: function(){
        var me = this;
        this.logger.log('_getExistingChoices');
        this.down('#field_values').setValue('');
        
        var field_name = this.down('#field_selector').getValue();
        var key = 'rally.techservices.fieldvalues.' + field_name;
        
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
    _validateAndSave: function() {
        var me = this;
        var value_field = this.down('#field_values');
        var raw_value = value_field.getValue();
        
        var values = Ext.util.Format.trim(raw_value).split(/\n/);
        var unique_array = Ext.Array.unique(values);
        
        var field_name = this.down('#field_selector').getValue();
        
        this.logger.log("_validateAndSave",field_name,unique_array);
        
        var key = 'rally.techservices.fieldvalues.' + field_name;
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