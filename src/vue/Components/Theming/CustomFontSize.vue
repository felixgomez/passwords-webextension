<template>
    <div class="setting">
        <translate tag="label" for="custom-font" say="SettingsCustomFontSize"/>
        <select-field id="custom-font" :options="options" v-model="model"/>
    </div>
</template>

<script>
    import SelectField from '@vue/Components/Form/SelectField';
    import Translate from '@vue/Components/Translate';

    export default {
        components: {Translate, SelectField},

        props: {
            value: {
                default: '11pt'
            }
        },

        data() {
            return {
                model: this.value ? this.value:'11pt'
            };
        },

        mounted() {
            this.model = this.value;
        },

        computed: {
            options() {
                let options = {
                    'xs' : 'FontSizeVerySmall',
                    's': 'FontSizeSmall',
                    'd': 'FontSizeDefault',
                    'm': 'FontSizeMedium',
                    'l': 'FontSizeLarge',
                    'xl': 'FontSizeVeryLarge'
                };

                if(!options.hasOwnProperty(this.value)) {
                    options[this.value] = this.value;
                }

                return options;
            }
        },

        watch: {
            value(value) {
                this.model = value;
            },
            model(value) {
                this.$emit('input', value);
            }
        }
    };
</script>