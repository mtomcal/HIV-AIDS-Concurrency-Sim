var defaultData = {
    "transP": 0.00,
    "addPartnerP": 0.00,
    "relationship": false
};

function randInt(max, min) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRand() {
    return Math.random();
}

function Relationships(num_indivs, gender_dist, circumcised_dist) {
    console.log("Relationships init");
    this.num_indivs = num_indivs;
    this.gender_dist = gender_dist;
    this.circumcised_dist = circumcised_dist;
    this.indivs = [];
    this.matrix = {};
    this.initIndivs();
    this.initMatrix();
}

Relationships.prototype.initIndivs = function () {
    var males = Math.floor(this.num_indivs * this.gender_dist);
    var females = this.num_indivs - males;
    var num_circ_males = Math.floor(this.circumcised_dist * males);
    console.log(num_circ_males);
    for (var i = 0; i < males - 1; i++) {
        if ( i < num_circ_males) {
            this.indivs.push(new Individual("male", true));
        } else {
            this.indivs.push(new Individual("male"));
        }
    }
    for (i = 0; i < females; i++) {
        this.indivs.push(new Individual("female"));
    }
    var infected = new Individual("male");
    infected.HIV = true;
    this.indivs.push(infected);
};

Relationships.prototype.initMatrix = function () {
    var default_matrix = [];
    for (var i = 0; i < (Math.pow(this.num_indivs, 2)); i++) {
        default_matrix.push(_.cloneDeep(defaultData));
    }
    this.matrix = new Matrix(this.num_indivs, default_matrix);
};

Relationships.prototype.getAt = function (i, j) {
    return this.matrix.getAt(i, j);
};

Relationships.prototype.setAt = function (i, j, obj) {
    this.matrix.setAt(i, j, obj);
};


Relationships.prototype.testMatrix = function () {
    for (var i = 0; i < this.num_indivs; i++) {
        for (var j = 0; j < this.num_indivs; j++) {
            console.log(this.getAt(i, j));
        }
    }
};

Relationships.prototype.testOneMatrix = function (i, j) {
    var o = this.getAt(i, j);
    o.transP = 0.50;
    this.setAt(i, j, o);
};


function Individual() {
    this.gender = arguments[0];
    if (arguments.length == 2) {
        this.circumcised = arguments[1];
    } else {
        this.circumcised = false;
    }
    this.HIV = false;
    this.sexActive = false;
}

Individual.prototype.setGender = function(gender) {
    this.gender = gender;
};

function Calculate(relations, kwargs) {
    this.rel = relations;
    if (kwargs !== null) {
        this.addPartnerP = kwargs.addPartnerP;
        this.transP = kwargs.transP;
        this.monogamy = kwargs.monogamy;
    } else {
        this.addPartnerP = 0.10;
        this.transP = 0.24;
        this.monogamy = false;
    }
}

Calculate.prototype.probOfPartner = function (a, b) {
    return this.addPartnerP;
};

Calculate.prototype.probOfTransmission = function (a, b) {
    var baseP = this.transP;
    if (a.HIV === false && b.HIV === false) {
        return 0.00;
    }
    if (a.HIV === true && b.HIV === true) {
        return 1.00;
    }
    if (a.HIV === true || b.HIV === true) {
        if (a.circumcised === true || b.circumcised === true) {
            return 0.24 - (0.24 * 0.60); //Circumcision paper (Tobian et al)
        }
        return 0.24;
    }
};

Calculate.prototype.execute = function () {
    for (var i = 0; i < this.rel.num_indivs; i++) {
        for (var j = i; j < this.rel.num_indivs; j++) {
            var obj = this.rel.getAt(i, j);
            var a = this.rel.indivs[i];
            var b = this.rel.indivs[j];
            obj.transP = this.probOfTransmission(a, b);
            obj.addPartnerP = this.probOfPartner(a, b);
            obj = this.rollDice(a, b, obj);
            this.rel.setAt(i, j, obj);
        }
    }
};

Calculate.prototype.rollDice = function (a, b, obj) {
    var roll = getRand();

    if (obj.relationship === true) {
        if (roll < obj.transP) {
            a.HIV = true;
            b.HIV = true;
        }
    }
    roll = getRand();
    if (roll < obj.addPartnerP) {
        if (a.gender !== b.gender) { 
            if (this.monogamy === true) {
                if (a.sexActive !== false || b.sexActive !== false) {
                    return obj;
                }
            }
            obj.relationship = true;
            a.sexActive = true;
            b.sexActive = true;
        }
    } else {
        if (obj.relationship === true) {
            obj.relationship = false;
            a.sexActive = false;
            b.sexActive = false;
        }
    }
    return obj;
};



function Simulate(kwargs) {
    var relations = null;
    if (kwargs !== null) {
        relations = new Relationships(50, 0.50, kwargs.circumcised_dist);
    } else {
        relations = new Relationships(50, 0.50, 0.50);
    }
    this.calc = new Calculate(relations, kwargs);
}

Simulate.prototype.timeStep = function() {
    this.calc.execute();
    return this.renderModel(this.calc.rel);
};

Simulate.prototype.timeZero = function () {
    return this.renderModel(this.calc.rel);
};

Simulate.prototype.getStats = function () {
    var indivs = this.calc.rel.indivs;
    var infected = 0;
    var male_infected = 0;
    var female_infected = 0;
    var count = indivs.length;
    var num_relations = 0;
    var concurrent_relations = 0;
    for (var i = 0; i < indivs.length; i++) {
        if (indivs[i].HIV === true) {
            infected++;
            if (indivs[i].gender === "male") {
                male_infected++;
            } else {
                female_infected++;
            }
        }
    }
    for (i = 0; i < indivs.length; i++) {
        var rel_count = 0;
        for (var j = i; j < indivs.length; j++) {
            var obj = this.calc.rel.getAt(i, j);
            if (obj.relationship === true) {
                num_relations++;
                rel_count++;
            }
        }
        if (rel_count > 1) {
            concurrent_relations++;
        }
    }
    return "Infected: " + infected + 
        " Male Infected: " + male_infected +
        " Female Infected: " + female_infected +
        " Number of Relations: " + num_relations + 
        " Number of Concurrent Relations: " + concurrent_relations +
        " Total Individuals: " + count;
};

Simulate.prototype.renderModel = function (relations) {
    var model = {
        "nodes": [],
        "links": [],
    };
    var indivs = relations.indivs;
    for (var i = 0; i < indivs.length; i++) {
        model.nodes.push({"gender": indivs[i].gender, "HIV": indivs[i].HIV, "circumcised": indivs[i].circumcised});
    }
    for (i = 0; i < indivs.length; i++) {
        for (var j = i; j < indivs.length; j++) {
            if (i != j) {
                var obj = relations.getAt(i, j);
                if (obj.relationship === true) {
                    model.links.push({"source": i, "target": j, "value": 2});
                }
            }
        }
    }
    return model;
};


angular.module('Concurrency', []);

angular.module('Concurrency')
.controller('main', function($scope, $q) {
    $scope.sim = new Simulate(null);
    $scope.relations = $scope.sim.timeZero();
    $scope.stats = $scope.sim.getStats();
    $scope.months = 0;
    $scope.addPartnerP = 0.10;
    $scope.transP = 0.24;
    $scope.circumcised_dist = 0.50;
    $scope.monogamy = false;
    $scope.timeStep = function () {
        $scope.relations = $scope.sim.timeStep();
        $scope.stats = $scope.sim.getStats();
        $scope.months++;
    };
    $scope.resetSim = function() {
        $scope.sim = new Simulate({"addPartnerP": $scope.addPartnerP, "circumcised_dist": $scope.circumcised_dist, "transP": $scope.transP, "monogamy": $scope.monogamy});
        $scope.relations = $scope.sim.timeZero();
        $scope.stats = $scope.sim.getStats();
        $scope.months = 0;
    };
});

angular.module('Concurrency').directive( 'diagram', [
  function () {
    return {
        restrict: 'E',
        scope: {
            data: '='
        },
        link: function (scope, element) {

            var width = 960,
            height = 500;

            var color = function (hiv, circumcised) {
                if (hiv === true && circumcised === true) {
                    return "#FF6258";
                } else if (hiv === true) {
                    return "#800900";
                } else if (circumcised === true) {
                    return "#4A8DFF";
                } else {
                    return "#001663";
                }
            };

            var force = d3.layout.force()
            .charge(-120)
            .linkDistance(80)
            .size([width, height]);

            var svg = d3.select("body").append("svg")
            .attr("width", width)
            .attr("height", height);

            scope.$watch('data', function () {

                var graph = scope.data;

                svg.selectAll(".node").remove();
                svg.selectAll(".link").remove();

                force
                .nodes(graph.nodes)
                .links(graph.links)
                .start();

                var link = svg.selectAll(".link")
                .data(graph.links)
                .enter().append("line")
                .attr("class", "link")
                .style("stroke-width", function(d) { return Math.sqrt(d.value); });

                var node = svg.selectAll(".node")
                .data(graph.nodes)
                .enter().append("rect")
                .attr("class", function(d) {
                    if (d.gender === "male") {
                        return "node male";
                    }
                    return "node female";
                })
                .attr("rx", function (d) {
                    if (d.gender === "male") {
                        return "0";
                    }
                    return "50";
                })
                .attr("ry", function (d) {
                    if (d.gender === "male") {
                        return "0";
                    }
                    return "50";
                })
                .attr("width", 10)
                .attr("height", 10)
                .style("fill", function(d) { 
                    return color(d.HIV, d.circumcised); 
                })
                .call(force.drag);

                node.append("title")
                .text(function(d) { return "Concurrency Sim"; });

                force.on("tick", function() {
                    link.attr("x1", function(d) { return d.source.x; })
                    .attr("y1", function(d) { return d.source.y; })
                    .attr("x2", function(d) { return d.target.x; })
                    .attr("y2", function(d) { return d.target.y; });

                node.attr("x", function(d) { return d.x; })
                    .attr("y", function(d) { return d.y; });
                });
            }, true);
        },
    };
}]);


