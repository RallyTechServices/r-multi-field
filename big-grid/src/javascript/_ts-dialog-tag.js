Ext.define('Rally.technicalservices.TagDialog',{
    extend: 'Rally.ui.dialog.Dialog',
    alias: 'widget.tstagdialog',
    config: {
        /* default settings. pass new ones in */
        autoShow: true,
        records:[],
        title: 'Tag Edit'
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
                itemId: 'tag_selector_box',
                width: 200
            }
        ]
    },
    constructor: function(config){
        this.mergeConfig(config);
        this.callParent([this.config]);
    },
    initComponent: function() {
        this.callParent(arguments);
        this.addEvents(
            /**
             * @event _tagselect
             * Fires when user clicks done after making settings choices
             * @param {Rally.technicalservices.SettingsDialog} this
             * @param [tags]
             */
            'tagselect',
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
                        this.fireEvent('tagselect', this, this._getTags());
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
    _getTags: function() {
        var me = this;
        var tags = [];
        if ( this.down('#tag_selector') ) {
            tags = this.down('#tag_selector').getValue();
        }
        return tags;
    },
    _addChoosers: function() {
        var me = this;
        this._addTagChooser();
        
    },
    _addTagChooser: function() {
        var me = this;

        this.down('#tag_selector_box').add({
            itemId:'tag_selector',
            xtype: 'rallytagpicker',
            fieldLabel: 'Tags',
            labelWidth: 35,
            autoExpand: false
        });
    }
});