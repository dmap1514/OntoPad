<script setup>
import PropertyList from '../components/PropertyList.vue'
</script>

<template>
  <div>
    <strong>Kanban with property {{ property_iri }}</strong>

    <div class="container-fluid">
      <div class="row">
        <div class="col-auto">
          <PropertyList :property_iri="property_iri" :selectProperty="(property) => {property_iri = property}" />
        </div>

        <div class="col container" v-if="property_iri">
          <div class="row">

            <div class="col mx-2 px-2 py-3 bg-light border rounded" v-for="(value, name, index) in dataModel">
              <h5>{{ name }}</h5>
              <draggable class="draggable-list" :list="value" item-key="key" group="prop_kanban">
                <template #item="{ element }">
                  <div class="list-group-item">
                    <div class="bg-white mt-3 p-2 border rounded">{{element.resource.value}}</div>
                  </div>
                 </template>
              </draggable>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import dedent from 'dedent-js'
import { mapState } from 'pinia'
import { useSelectionStore } from '../stores/selection'
import { useRdfStore } from '../stores/rdf'
import { cloneDeep } from 'lodash';
import draggable from "vuedraggable"
import { quadStreamToString, quadStreamToStore, stringToStore } from '../helpers/rdf-parse'
import { diff_n3 } from '../helpers/n3-compare'
import rdf from '@rdfjs/data-model'

let idGlobal = 8;

export default {
  name: 'Kanban',
  components: {
    draggable,
  },
  setup () {
    const store = useRdfStore();
    return { store }
  },
  mounted () {
  },
  watch: {
    property_iri (value) {
      console.log("property_iri changed: " + value);
      this.getResource()
    }
  },
  data () {
    return {
      originalDataModel: {},
      dataModel: {},
      property_iri: "",
    }
  },
  methods: {
    async getResource () {
      console.log('get resource')
      const result = await useRdfStore().sendQuery(dedent(`
        select distinct ?resource ?value {
          ?resource <${ this.property_iri }> ?value
        }
      `))
      if (result.resultType === 'bindings') {
        const bindingsStream = await result.execute()
        this.originalDataModel = {}
        for await (const bindings of bindingsStream) {
          if (this.originalDataModel[bindings.get("value").value] == undefined) {
            this.originalDataModel[bindings.get("value").value] = []
            console.log(`create array for ${ bindings.get("value").value }`);
          }
          this.originalDataModel[bindings.get("value").value].push({"resource": bindings.get("resource"), "value": bindings.get("value").value, "key": bindings.get("resource").value})
        }
        this.dataModel = cloneDeep(this.originalDataModel)

        console.log(this.originalDataModel)
        console.log(this.dataModel)
      }
    },
  }
}

</script>

<style scoped>
.col {
  overflow: auto;
}
.draggable-list {
  min-height: 10vh;
}
.draggable-list > div {
  cursor: pointer;
}
</style>
