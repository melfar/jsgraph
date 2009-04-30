// More info on http://github.com/melfar/jsgraph/

// utils
jQuery.prototype.oldToString = jQuery.prototype.toString;
jQuery.prototype.toString = function() {  // generate string keys for hashes
  if (this[0]) return this[0].id; else return this.oldToString();
}
function debug(line) { $('#debug').append(line + '<br />'); }

// now get to the business
var JSGraph = window.JSGraph = function(id) {
  this.init(id);
  return this;
}

JSGraph.prototype = {
  init: function(id) {
    this.nodes  = {};
    this.edges = [];
    this.graph = $('#' + id);
    this.jg = new jsGraphics(id);
    this.traverse(this.graph, this.create_node);
    this.force_direct();
    this.redraw();
    var self = this;
    $(function() {
      var container = self.graph.parent();
      container.scrollview();
      var firstNode = self.nodes[$(self.graph.children('div.node').get(0))];
      if (firstNode) {
        container.scrollLeft(firstNode.node.position().left - container.width()/2  + firstNode.halfsize[0])
                 .scrollTop(firstNode.node.position().top   - container.height()/2 + firstNode.halfsize[1]);
      }
    });
  },
  
  create_node: function(val) {
    var img = $(document.createElement("img"));
    img.attr('id',       'i' + val.id)
       .attr('src',      val.id == 'node1' ? 'images/node-red.png' : 'images/node-green.png');
    img.css('position',  'absolute')
       .css('zIndex',    1);
    this.graph.append(img);
    this.nodes[$(val)] = {
      x: this.graph.width()/2,
      y: this.graph.height()/2,
      node:     img,
      halfsize: [6, 6],
      dx: 0,
      dy: 0,
      fixed: false,
      massfade: 0,
      justMadeLocal: false, 
      markedForRemoval: false,
      repulsion: 15
    };
  },

  traverse: function(data, func) {
    var self = this;
    $(data).children('div.node').each(function() {
      func.call(self, this);
      if (this.childNodes)  self.traverse(this, func);
    });
  },
  
  draw_edges: function(val) {
    var node1 = this.nodes[$(val)];
    var node2 = this.nodes[$(val.parentNode)];
    if (node1 && node2) 
    {
      node1.node.css('left', node1.x).css('top', node1.y);
      node2.node.css('left', node2.x).css('top', node2.y);
      this.jg.drawLine(node1.x + node1.halfsize[0], node1.y + node1.halfsize[1], 
                       node2.x + node2.halfsize[0], node2.y + node2.halfsize[1]);
    }
  },
  
  redraw: function() {
    this.jg.setColor("#ddd");
    this.jg.clear();
    this.traverse(this.graph, this.draw_edges);
    this.jg.paint();
  },
  
  find_edges: function(val) {
    if ($(val).parent() == this.graph.id)  return;
    var node   = this.nodes[$(val)];
    var parent = this.nodes[$(val).parent()];
    if (node && parent) {
      this.edges.push({ from: node, to: parent });
    }
  },

  force_direct: function() {        
    var self = this;
    this.traverse(this.graph, this.find_edges);
    
    // Algorithm borrowed from TouchGraph by Alexander Shapiro
    var damper = 1.0, maxMotion = 0.0, lastMaxMotion = 0.0, motionRatio = 0.0, damping = true; 
    var rigidity = 1.0, newRigidity = 1.0;
    var dragNode = null;
    var defaultLength = 10.0;
    
    var relaxEdges = function() {
      $.each(self.edges, function() {
        var e = this;

        var vx = e.to.x - e.from.x;
        var vy = e.to.y - e.from.y;
        var len = Math.sqrt(vx * vx + vy * vy);

        var dx=vx*rigidity;
        var dy=vy*rigidity;

        dx /=(defaultLength*100);
        dy /=(defaultLength*100);

        if (e.to.justMadeLocal || e.to.markedForRemoval || 
            (!e.from.justMadeLocal && !e.from.markedForRemoval)) {
        	e.to.dx -= dx*len;
          e.to.dy -= dy*len;
        } else {
        	var massfade = (e.from.markedForRemoval ? e.from.massfade : 1-e.from.massfade);
        	massfade *= massfade;
          e.to.dx -= dx*len*massfade;
          e.to.dy -= dy*len*massfade;
        }
        if (e.from.justMadeLocal || e.from.markedForRemoval || 
            (!e.to.justMadeLocal && !e.to.markedForRemoval)) {                
          e.from.dx += dx*len;
          e.from.dy += dy*len;
        } else {
        	var massfade = (e.to.markedForRemoval ? e.to.massfade : 1-e.to.massfade);
        	massfade *= massfade;
          e.from.dx += dx*len*massfade;
          e.from.dy += dy*len*massfade;
        }
      });
    }
    
    var fakerandom = function() {
      this.i = this.i || 0;
      this.v = this.v || [0.63, 0.29, 0.89, 0.23, 0.32, 0.68, 0.74, 0.62, 0.72, 0.37, 0.97, 0.93, 0.60, 0.13, 0.91, 0.08, 0.42, 0.70, 0.04, 0.11, 0.21, 0.65, 0.58, 0.57, 0.61, 0.68, 0.62, 0.70, 0.20, 0.12, 0.49, 0.91, 0.56, 0.60, 0.75, 0.32, 0.09, 0.36, 0.09, 0.16, 0.39, 0.65, 0.33, 0.82, 0.36, 0.43, 0.76, 0.29, 0.09, 0.64, 0.54, 0.80, 0.87, 0.97, 0.24, 0.75, 0.17, 0.24, 0.12, 0.15, 0.94, 0.65, 0.43, 0.37, 0.89, 0.52, 0.59, 0.79, 0.70, 0.89, 0.23, 0.79, 0.67, 0.05, 0.07, 0.36, 0.35, 0.84, 0.76, 0.25, 0.03, 0.19, 0.43, 0.91, 0.53, 0.40, 0.85, 0.63, 0.80, 0.75, 0.21, 0.34, 0.71, 0.48, 0.84, 0.88, 0.23, 0.14, 0.62, 0.57];
      if(this.i >= 100)  this.i = 0;
      return this.v[this.i++];
    }
  
    var avoidLabels = function() {
      $.each(self.nodes, function() {
        var n1 = this;
        $.each(self.nodes, function() {
          var n2 = this;
          if (n1 == n2)  return;

          var dx=0;
          var dy=0;
          var vx = n1.x - n2.x;
          var vy = n1.y - n2.y;
          var len = vx * vx + vy * vy;

          if (len == 0) {
            dx = fakerandom();
            dy = fakerandom();
          } else if (len <600*600) { 
            dx = vx / len; 
            dy = vy / len; 
          }			

          var repSum = n1.repulsion * n2.repulsion/100;                              
          if(n1.justMadeLocal || n1.markedForRemoval || (!n2.justMadeLocal && !n2.markedForRemoval)) {  
            n1.dx += dx*repSum*rigidity;
            n1.dy += dy*repSum*rigidity;
          }
          else {
          	var massfade = (n2.markedForRemoval ? n2.massfade : 1-n2.massfade);
          	massfade*=massfade;
            n1.dx += dx*repSum*rigidity*massfade;
            n1.dy += dy*repSum*rigidity*massfade;
          }
          if (n2.justMadeLocal || n2.markedForRemoval || (!n1.justMadeLocal && !n1.markedForRemoval)) {
            n2.dx -= dx*repSum*rigidity;                  		
            n2.dy -= dy*repSum*rigidity;
          }
          else {
            var massfade = (n1.markedForRemoval ? n1.massfade : 1-n1.massfade);
          	massfade*=massfade;
            n2.dx -= dx*repSum*rigidity*massfade;
            n2.dy -= dy*repSum*rigidity*massfade;
          }               
        });
      });
    }
  
    var damp = function() {
      if (damping) {
        if(motionRatio <= 0.001) {
          if ((maxMotion < 0.2 || (maxMotion > 1 && damper < 0.9)) && damper > 0.01) damper -= 0.01;
          else if (maxMotion < 0.4 && damper > 0.003) damper -= 0.003;
          else if(damper > 0.0001) damper -= 0.0001;
        }
      }
      if(maxMotion<0.001 && damping) {
        damper=0;
      }
    }
  
    var moveNodes = function() {
      lastMaxMotion = maxMotion;
      var maxMotionA = 0;

      $.each(self.nodes, function() {
        var n = this;
      
        var dx = n.dx, dy = n.dy;

        dx *= damper;
        dy *= damper;
        n.dx= dx/2; 
        n.dy= dy/2; 

        var distMoved = Math.sqrt(dx*dx+dy*dy); 
        if (!n.fixed && !(n == dragNode)) {
          n.x += Math.max(-30, Math.min(30, dx)); 
          n.y += Math.max(-30, Math.min(30, dy)); 
        }
      
        maxMotionA = Math.max(distMoved, maxMotionA);
        if(!n.justMadeLocal && !n.markedForRemoval) { n.massfade=1; }
				else { 					 
					if(n.massfade>=0.004) n.massfade-=0.004; 
				}
      });

      maxMotion=maxMotionA;
      if (maxMotion>0) motionRatio = lastMaxMotion/maxMotion-1; 
      else motionRatio = 0;                                     

      damp();
    }    

    do {
      for (var i = 0; i < 10; i++) {
        relaxEdges();
        avoidLabels();
        moveNodes();
      }
      rigidity= newRigidity;
      //self.redraw();
    }
    while(maxMotion > 0.01);
  }
}
