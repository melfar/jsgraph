#!/usr/bin/env ruby

require 'rubygems'
require 'hpricot'

class SpringGraph

  def initialize
    str = <<END
    <div id="node1" class="node">
      <div id="node2" class="node"></div>
      <div id="node3" class="node">
        <div id="node4" class="node">
          <div id="node5" class="node"></div>
          <div id="node6" class="node"></div>
        </div>
      </div>
      
      <div id="node7" class="node">
        <div id="node8" class="node"></div>
        <div id="node9" class="node">
          <div id="node10" class="node"></div>
          <div id="node11" class="node">
            <div id="node12" class="node">
              <div id="node13" class="node"></div>
              <div id="node14" class="node"></div>
              <div id="node15" class="node"></div>
              <div id="node16" class="node"></div>
              <div id="node17" class="node">
                <div id="node18" class="node"></div>
                <div id="node19" class="node"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
END

    @graph = Hpricot(str)
    @nodes = {}
    @edges = []
    @width=380
    @height=380
    force_direct
  end

  def traverse(data, proc)
    data.children_of_type("div").each do |node|
      proc.call(node)
      traverse(node, proc) if node.children
    end
  end
  
  def dump(id = nil)
    root = id.nil? ? @graph : @graph/"\##{id}"
    @nodes.each do |k, v|
      k.raw_attributes['x'] = v[:x].to_s
      k.raw_attributes['y'] = v[:y].to_s
    end
    root.to_html
  end

  def force_direct
    traverse(@graph, Proc.new{|node| create_node(node) })
    traverse(@graph, Proc.new{|node| find_edges(node) })

    # Algorithm borrowed from TouchGraph by Alexander Shapiro
    @damper = 1.0
    @maxMotion = 0.0
    @lastMaxMotion = 0.0
    @motionRatio = 0.0
    @damping = true 
    @rigidity = 1.0
    @newRigidity = 1.0
    @dragNode = nil
    @defaultLength = 10.0

    begin
      10.times do
        relax_edges
        avoid_labels
        move_nodes
      end
      @rigidity= @newRigidity
    end while @maxMotion > 0.1
  end

  def create_node(n)
    @nodes[n] = {
      :n => n,
      :x => @width/2,
      :y => @height/2,
      :halfsize => [6, 6],
      :dx => 0,
      :dy => 0,
      :fixed => false,
      :massfade => 0,
      :justMadeLocal => false, 
      :markedForRemoval => false,
      :repulsion => 15
    }
  end

  def find_edges(node)
    return if node.parent == @graph
    node   = @nodes[node]
    parent = @nodes[node[:n].parent]
    if (node && parent)
      @edges.push({ :from => node, :to => parent });
    end
  end
  
  def relax_edges
    @edges.each do |e|
      vx = e[:to][:x] - e[:from][:x]
      vy = e[:to][:y] - e[:from][:y]
      len = Math.sqrt(vx * vx + vy * vy)

      dx=vx*@rigidity
      dy=vy*@rigidity

      dx /=(@defaultLength*100)
      dy /=(@defaultLength*100)

      if (e[:to][:justMadeLocal] || e[:to][:markedForRemoval] || 
          (!e[:from][:justMadeLocal] && !e[:from][:markedForRemoval]))
      	e[:to][:dx] -= dx*len
        e[:to][:dy] -= dy*len
      else
      	massfade = (e[:from][:markedForRemoval] ? e[:from][:massfade] : 1-e[:from][:massfade])
      	massfade *= massfade
        e[:to][:dx] -= dx*len*massfade
        e[:to][:dy] -= dy*len*massfade
      end
      if (e[:from][:justMadeLocal] || e[:from][:markedForRemoval] || 
          (!e[:to][:justMadeLocal] && !e[:to][:markedForRemoval]))         
        e[:from][:dx] += dx*len
        e[:from][:dy] += dy*len
      else
      	massfade = (e[:to][:markedForRemoval] ? e[:to][:massfade] : 1-e[:to][:massfade])
      	massfade *= massfade
        e[:from][:dx] += dx*len*massfade
        e[:from][:dy] += dy*len*massfade
      end
    end
  end
  
  def avoid_labels
    @nodes.each do |key, n1|
      @nodes.each do |key, n2|
        next if (n1 == n2)

        dx=0
        dy=0
        vx = n1[:x] - n2[:x]
        vy = n1[:y] - n2[:y]
        len = vx * vx + vy * vy

        if len == 0
          dx = rand
          dy = rand
        elsif len <600*600
          dx = vx / len
          dy = vy / len 
        end

        repSum = n1[:repulsion] * n2[:repulsion]/100                              
        if (n1[:justMadeLocal] || n1[:markedForRemoval] || (!n2[:justMadeLocal] && !n2[:markedForRemoval]))
          n1[:dx] += dx*repSum*@rigidity
          n1[:dy] += dy*repSum*@rigidity
        else
        	massfade = (n2[:markedForRemoval] ? n2[:massfade] : 1-n2[:massfade])
        	massfade*=massfade
          n1[:dx] += dx*repSum*@rigidity*massfade
          n1[:dy] += dy*repSum*@rigidity*massfade
        end
        if (n2[:justMadeLocal] || n2[:markedForRemoval] || (!n1[:justMadeLocal] && !n1[:markedForRemoval]))
          n2[:dx] -= dx*repSum*@rigidity
          n2[:dy] -= dy*repSum*@rigidity
        else
          massfade = (n1[:markedForRemoval] ? n1[:massfade] : 1-n1[:massfade])
        	massfade*=massfade
          n2[:dx] -= dx*repSum*@rigidity*massfade
          n2[:dy] -= dy*repSum*@rigidity*massfade
        end            
      end
    end
  end
  
  def damp
    if (@damping)
      if(@motionRatio <= 0.001)
        if ((@maxMotion < 0.2 || (@maxMotion > 1 && @damper < 0.9)) && @damper > 0.01) 
          @damper -= 0.01
        elsif (@maxMotion < 0.4 && @damper > 0.003) 
          @damper -= 0.003
        elsif (@damper > 0.0001) 
          @damper -= 0.0001
        end
      end
    end
    if(@maxMotion<0.001 && @damping)
      @damper=0
    end
  end
  
  def move_nodes
    @lastMaxMotion = @maxMotion
    maxMotionA = 0

    @nodes.each do |key, n|
      dx = n[:dx]
      dy = n[:dy]

      dx *= @damper
      dy *= @damper
      n[:dx]= dx/2
      n[:dy]= dy/2 

      distMoved = Math.sqrt(dx*dx+dy*dy)
      if (!n[:fixed] && !(n == @dragNode))
        n[:x] += [-30, [30, dx].min].max
        n[:y] += [-30, [30, dy].min].max
      end
    
      maxMotionA = [distMoved, maxMotionA].max
      if(!n[:justMadeLocal] && !n[:markedForRemoval])
        n[:massfade]=1
			else	 
				n[:massfade]-=0.004 if(n[:massfade]>=0.004)
			end
    end
    
    @maxMotion=maxMotionA
    if (@maxMotion>0) 
      @motionRatio = @lastMaxMotion/@maxMotion-1
    else
      @motionRatio = 0                                     
    end

    damp
  end
  
end

require 'rubygems'
#require 'sinatra'

graph = SpringGraph.new
puts graph.dump

# get '/:id' do |id|
#   graph.dump(id)
# end
# get '/' do
#   graph.dump
# end
