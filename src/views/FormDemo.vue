<template>
    <splitpanes class="default-theme">
        <pane size="70">
            <div>
                <dl>
                    <dt>IRI</dt>
                    <dd>{{ resource_iri }}</dd>
                    <dt>Type</dt>
                    <dd>
                        <Term v-model:term="res_type" @click="selectResource" />
                    </dd>
                </dl>
            </div>
            <div>
                <!--
            SHACL shapes can be defined on the attribute 'data-shapes'
            or can be loaded by setting attribute 'data-shapes-url'
          -->
                <shacl-form @change="getFormTurtle" ref="myform" data-submit-button @submit="onSubmit"
                    data-generate-node-shape-reference data-show-node-ids v-bind:data-values="dataTurtle"
                    v-bind:data-shapes="shapeTurtle" v-bind:data-values-subject="dataSubject"></shacl-form>

                <button @click="onDelete" class="delete-button">Delete</button>
            </div>

        </pane>
        <pane size="30">
            <InstanceList style="height:80vh; overflow-y:scroll;" />
        </pane>
    </splitpanes>
</template>

<script>
import Term from '../components/Term.vue'
import { Readable } from 'readable-stream'
import { mapState } from 'pinia'
import { useRdfStore } from '../stores/rdf'
import { useSelectionStore } from '../stores/selection'
import { Store, StreamParser, Parser, Writer, DataFactory } from 'n3'
import { registerPlugin } from '@ulb-darmstadt/shacl-form'
import { getShapeQuery4Target, getShapeQuery4Instance, getResourceQuery } from '../helpers/queries'
import { defaultShape, defaultData } from '../helpers/rdf-data'
import { quadStreamToString } from '../helpers/rdf-parse'
import { streamToStore } from 'rdf-dereference-store';
import { Splitpanes, Pane } from 'splitpanes'
// import { LeafletPlugin } from '@ulb-darmstadt/shacl-form/plugins/leaflet.js'
// import * as jsonld from 'jsonld'
import rdf from '@rdfjs/data-model'
import InstanceList from '@/components/InstanceList.vue'
import { validate } from 'uuid'

export default {
    name: 'FormDemo',
    setup() {
        const store = useRdfStore();
        const selection = useSelectionStore();
        return { store, selection }
    },
    components: {
        Term,
        InstanceList,
        Splitpanes,
        Pane
    },
    mounted() {
        this.getFormData();
    },
    watch: {
        resource_iri(value) {
            this.getResource()
        },
        resource_iri(value) {
            this.getFormData()
        }
    },
    data() {
        return {
            dataModel: {},
            dataTurtle: defaultData,
            dataSubject: "",
            shapeTurtle: defaultShape,
            subject: rdf.namedNode(''),
        }
    },
    computed: {
        ...mapState(useSelectionStore, ['graph_iri', 'resource_iri', 'is_class']),
        res_type() {
            if (this.dataModel.getQuads !== undefined) {
                const res_type = this.dataModel.getQuads(rdf.namedNode(this.resource_iri), rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), null)[0]
                if (res_type) {
                    return res_type.object
                }
            }
            return ''
        }
    },
    methods: {
        getFormTurtle(event) {
            const form = this.$refs.myform
            if (event.detail?.valid) {
                const triples = form.serialize()
                console.log('entered form data', triples)
            }
        },
        async onSubmit() {
            const form = this.$refs.myform;
            const quadsString = form.serialize();

            const parser = new Parser();
            const quads = parser.parse(quadsString);

            let new_iri;
            let updatedQuads = quads;

            if (this.is_class) {
                const resourceEnd = this.getLocalNameFromIri(this.resource_iri);

                const blankNode = this.extractBlankNode(quads);
                new_iri = `${this.graph_iri}${resourceEnd}/${blankNode}`;

                updatedQuads = this.replaceBlankNodeWithIri(quads, blankNode, new_iri);
            } else {
                await this.onDelete();
            }

            await this.store.deleteInsertData({
                insertArray: updatedQuads,
                graphIri: this.graph_iri
            });


        },


        async onDelete() {
            if (this.is_class) {
                console.log("nothing to delete.")
                return;
            }
            try {

                const triplesToDelete = await this.store.getResource(this.resource_iri);
                const quadsToDelete = await Readable.from(triplesToDelete).toArray();

                await this.store.deleteInsertData({
                    deleteArray: quadsToDelete,
                    graphIri: this.graph_iri
                });

                console.log('Triple deleted.');
            } catch (error) {
                console.error('Triples can not be deleted:', error);
            }
        },
        async getResource() {
            this.subject = rdf.namedNode(this.resource_iri)
            const resourceData = await this.store.getResource(this.resource_iri)
            const originalData = (await quadStreamToStore(resourceData)).store
            return await quadStreamToString(originalData.match(), { format: 'application/n-triples', prefixes: this.prefixes_flat })
        },
        async getInstance() {
            var result = await this.store.sendQuery({ query: await getResourceQuery(this.resource_iri) })
            if (result.resultType === 'quads') {
                const quadStream = await result.execute()
                var instanceData = await quadStream.toArray()
            }
            var instance_string = await this.serialize(instanceData, { format: 'application/n-triples', prefixes: this.prefixes })
            return instance_string.replaceAll("\"", "'")
        },
        async getFormData() {
            console.log('Form: Get form data')
            let shapeData = []
            let result = ""
            let dataSubject = ""

            if (this.is_class) {
                result = await this.store.sendQuery({ query: await getShapeQuery4Target(this.resource_iri) })
            } else {
                result = await this.store.sendQuery({ query: await getShapeQuery4Instance(this.resource_iri) })
                dataSubject = this.resource_iri
            }

            if (result.resultType === 'quads') {
                const quadStream = await result.execute()
                shapeData = await quadStream.toArray()
            }
            let shapeTurtle = ""
            let dataTurtle = ""

            if (shapeData.length < 1) {
                console.log('Form: Use default shape')
                shapeTurtle = defaultShape
            } else {
                console.log('Form: Use found shape')
                let data_string = ""

                if (this.is_class == false) {
                    let instance_data = await this.getInstance()
                    dataTurtle = instance_data.replaceAll("\"", "'")
                }

                let shape_string = await this.serialize(shapeData, { format: 'application/n-triples', prefixes: this.prefixes })
                shapeTurtle = shape_string.replaceAll("\"", "'")
            }
            // debug output TODO: remove when working
            console.log('Form: Shape as n-triples')
            console.log(shapeTurtle)
            console.log('Form: Instance as n-triples')
            console.log(dataTurtle)
            console.log('Form: dataSubject')
            console.log(dataSubject)
            this.shapeTurtle = shapeTurtle
            this.dataSubject = dataSubject
            this.dataTurtle = dataTurtle
        },
        selectResource(resourceIri) {
            this.selection.changeResourceIri(resourceIri)
        },
        serialize(data, serializerConfig = {}) {
            return new Promise((resolve, reject) => {
                const rdfWriter = new Writer(serializerConfig)
                data.forEach((quad) => {
                    rdfWriter.addQuad(quad)
                })
                rdfWriter.end((error, result) => {
                    if (error !== null) {
                        reject(error)
                    }
                    resolve(result)
                })
            })
        },
        getLocalNameFromIri(iri) {
            const parts = iri.split(/[#\/]/); // Teilt bei "/" oder "#"
            return parts.pop() || null;
        },
        validateIri(iri) {
            if (!validateIRI(iri)) {
                return null; // Ungültige IRI
            }

            try {
                DataFactory.namedNode(iri);
                return true;
            } catch {
                return false;
            }
        },
        extractBlankNode(quads) {
            for (const quad of quads) {
                if (quad.subject.termType === "BlankNode") {
                    return quad.subject.value; // Gibt den Identifier des Blank Nodes zurück
                }
            }
            console.warn("no blank node found");
            return "default"; // Rückfallwert, falls kein Blank Node vorhanden ist
        },
        replaceBlankNodeWithIri(quads, blankNode, newIri) {
            const updatedQuads = quads.map((quad) => {
                const subject = (quad.subject.termType === "BlankNode" && quad.subject.value === blankNode)
                    ? { termType: "NamedNode", value: newIri }
                    : quad.subject;

                return {
                    subject,
                    predicate: quad.predicate,
                    object: quad.object,
                    graph: quad.graph,
                };
            });

            return updatedQuads;
        },
    }
}

</script>