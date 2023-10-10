import Rect from "./Rect.js";
import Site from "./Site.js";
import Voronoi from "./Voronoi.js";

var VoronoiDemo = {
    voronoi: new Voronoi(),
    sites: [],
    diagram: null,
    margin: 0.15,
    canvas: null,
    bbox: new Rect(800, 600),
    benchmarkTimer: null,
    benchmarkTimes: new Array(50),
    benchmarkPointer: 0,
    benchmarkMaxSites: 100,

    init: function () {
        this.canvas = document.getElementById('voronoiCanvas');
        this.randomSites(100, true);
        this.render();
    },

    benchmarkToggle: function () {
        if (this.benchmarkTimer) {
            this.benchmarkStop();
        }
        else {
            this.benchmarkStart();
        }
    },

    benchmarkStart: function () {
        this.benchmarkMaxSites = Math.floor(parseFloat(document.getElementById('voronoiNumberSites').value));
        this.benchmarkPointer = 0;
        this.benchmarkTimer = setTimeout(this.benchmarkDo, 250);
        document.getElementById('voronoiBenchmark').value = 'Stop';
    },

    benchmarkDo: function () {
        var vd = VoronoiDemo;
        vd.randomSites(vd.benchmarkMaxSites, true);
        vd.render();
        vd.benchmarkTimes[vd.benchmarkPointer] = vd.diagram.execTime;
        vd.benchmarkPointer++;
        if (vd.benchmarkPointer < vd.benchmarkTimes.length) {
            document.getElementById('benchmarkResult').innerHTML = new Array(vd.benchmarkTimes.length - vd.benchmarkPointer + 1).join('.');
            vd.benchmarkTimer = setTimeout(vd.benchmarkDo, 250);
        }
        else {
            vd.benchmarkStop();
        }
    },

    benchmarkStop: function () {
        if (this.benchmarkTimer) {
            clearTimeout(this.benchmarkTimer);
            this.benchmarkTimer = null;
        }
        var sum = 0;
        var fastest = Number.MAX_VALUE;
        var slowest = -Number.MAX_VALUE;
        this.benchmarkTimes.map(function (v) {
            sum += v;
            fastest = Math.min(v, fastest);
            slowest = Math.max(v, slowest);
        });
        sum -= fastest;
        sum -= slowest;
        var avg = sum / (this.benchmarkPointer - 2);
        document.getElementById('benchmarkResult').innerHTML =
            'average exec time for ' +
            this.benchmarkMaxSites +
            ' sites = ' +
            avg.toFixed(1) + ' ms ' +
            ' (' + (avg * 1000 / this.benchmarkMaxSites).toFixed(1) + ' µs/site)' +
            ', fastest = ' + fastest + ' ms, slowest = ' + slowest + ' ms.'
            ;
        document.getElementById('voronoiBenchmark').value = 'Benchmark';
    },

    clearSites: function () {
        this.sites = [];
        this.diagram = this.voronoi.compute(this.sites, this.bbox);
        this.updateStats();
    },

    randomSites: function (n, clear) {
        if (clear) { this.sites = []; }
        // create vertices
        var xmargin = this.canvas.width * this.margin;
        var ymargin = this.canvas.height * this.margin;
        var xo = xmargin;
        var dx = this.canvas.width - xmargin * 2;
        var yo = ymargin;
        var dy = this.canvas.height - ymargin * 2;
        for (var i = 0; i < n; i++) {
            this.sites.push(new Site(
                xo + Math.random() * dx + Math.random() / dx,
                yo + Math.random() * dy + Math.random() / dy
            ));
        }
        this.voronoi.recycle(this.diagram);
        this.diagram = this.voronoi.compute(this.sites, this.bbox);
        this.updateStats();
    },

    recompute: function () {
        this.diagram = this.voronoi.compute(this.sites, this.bbox);
        this.updateStats();
    },

    updateStats: function () {
        if (!this.diagram) { return; }
        var e = document.getElementById('voronoiStats');
        if (!e) { return; }
        e.innerHTML = '(' + this.diagram.cells.length + ' Voronoi cells computed from ' + this.diagram.cells.length + ' Voronoi sites in ' + this.diagram.execTime + ' ms &ndash; rendering <i>not</i> included)';
    },

    render: function () {
        var ctx = this.canvas.getContext('2d');
        // background
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.rect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = '#888';
        ctx.stroke();
        // voronoi
        if (!this.diagram) { return; }
        // edges
        ctx.beginPath();
        ctx.strokeStyle = '#000';
        var edges = this.diagram.edges;
        var iEdge = edges.length;
        var edge, v;
        while (iEdge--) {
            edge = edges[iEdge];
            v = edge.va;
            ctx.moveTo(v.x, v.y);
            v = edge.vb;
            ctx.lineTo(v.x, v.y);
        }
        ctx.stroke();
        // edges
        ctx.beginPath();
        ctx.fillStyle = 'red';
        var vertices = this.diagram.vertices;
        var iVertex = vertices.length;
        while (iVertex--) {
            v = vertices[iVertex];
            ctx.rect(v.x - 1, v.y - 1, 3, 3);
        }
        ctx.fill();
        // sites
        ctx.beginPath();
        ctx.fillStyle = '#44f';
        var sites = this.sites;
        var iSite = sites.length;
        while (iSite--) {
            v = sites[iSite];
            ctx.rect(v.x - 2 / 3, v.y - 2 / 3, 2, 2);
        }
        ctx.fill();
    },
};



export default VoronoiDemo;