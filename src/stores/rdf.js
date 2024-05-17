import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { EndpointFactory } from '@/api/endpoint.js'
import { Generator } from 'sparqljs'
import { quadToStringQuad } from 'rdf-string'
import config from '@/config'

export const useRdfStore = defineStore('rdf', {
  state: () => ({
      graph_iri: config.graph_iri,
      resource_iri: config.resource_iri,
      sparqlEndpoint: EndpointFactory.create(config.endpoint)
  }),
  actions: {
    sendQuery (payload) {
      let query = ''
      let data = false
      if (typeof payload === 'object') {
        query = payload.query
        data = payload.data
      } else {
        query = payload
      }
      console.log('send query with data=' + data + ' query: ' + query)
      let defaultGraph
      let queryString = ''
      if (typeof query === 'string') {
        queryString = query
        defaultGraph = [this.graph_iri]
      } else if (query instanceof Object) {
        queryString = query.query
        if (query.queryQuads !== undefined) {
          defaultGraph = undefined
        } else if (query.defaultGraph !== undefined) {
          defaultGraph = query.defaultGraph
        } else {
          defaultGraph = [this.graph_iri]
        }
      } else {
        console.error('can process query')
        console.error(query)
      }
      return this.sparqlEndpoint.query(queryString, defaultGraph, data)
    },
    getResource (resourceUri, defaultGraph) {
      if (defaultGraph === undefined) {
        defaultGraph = [this.graph_iri]
      }
      const queryString = 'construct where {<' + resourceUri + '> ?p ?o}'
      return this.sparqlEndpoint.query(queryString, defaultGraph, true)
    },
    sendUpdate (updateString) {
      this.sparqlEndpoint.update(updateString)
        .then(function (response) {
          console.log(response)
        })
    },
    push () {
      if (this.sparqlEndpoint.push !== undefined) {
        this.sparqlEndpoint.push()
          .then(function (response) {
            console.log(response)
          })
      }
    },
    pull () {
      if (this.sparqlEndpoint.pull !== undefined) {
        this.sparqlEndpoint.pull()
          .then(function (response) {
            console.log(response)
          })
      }
    },
    insertDeleteData (payload) {
      const insertArray = payload.insertArray
      const deleteArray = payload.deleteArray
      const graphIri = payload.graphIri

      const updateStructure = {
        type: 'update',
        updates: []
      }

      // Delete has to come first, to not later remove stuff, we've just added
      if (deleteArray) {
        const deleteBGP = {
          triples: deleteArray.map(quadToStringQuad)
        }
        if (graphIri === undefined) {
          deleteBGP.type = 'bgp'
        } else {
          deleteBGP.type = 'graph'
          deleteBGP.name = graphIri
        }
        updateStructure.updates.push(
          {
            updateType: 'delete',
            delete: [deleteBGP]
          }
        )
      }

      if (insertArray) {
        const insertBGP = {
          triples: insertArray.map(quadToStringQuad)
        }
        if (graphIri === undefined) {
          insertBGP.type = 'bgp'
        } else {
          insertBGP.type = 'graph'
          insertBGP.name = graphIri
        }
        updateStructure.updates.push(
          {
            updateType: 'insert',
            insert: [insertBGP]
          }
        )
      }

      var generator = new Generator()
      var updateString = generator.stringify(updateStructure)
      console.log('updatestring: ' + updateString)
      return this.sparqlEndpoint.update(updateString)
    },
    changeGraphIri (graphIri) {
      console.log('Change graph Iri to ' + graphIri)
      this.graph_iri = graphIri
    },
    changeResourceIri (resourceIri) {
      console.log('Change resource Iri to ' + resourceIri)
      this.resource_iri = resourceIri
    },
    updateEndpointConfiguration (configuration) {
      console.log('Change SPARQL Endpoint configuration.')
      console.log(configuration)
      this.sparqlEndpoint = EndpointFactory.create(configuration)
    }
  },
})