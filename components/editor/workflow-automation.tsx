'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { 
  Workflow, Plus, Play, Pause, Trash2, Settings, 
  GitBranch, Zap, Clock, FileText
} from 'lucide-react';

interface WorkflowTrigger {
  type: 'push' | 'pull_request' | 'schedule' | 'manual';
  config: Record<string, any>;
}

interface WorkflowAction {
  type: 'test' | 'deploy' | 'notify' | 'review';
  config: Record<string, any>;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  is_active: boolean;
  created_at: string;
}

export default function WorkflowAutomation() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      });
      
      if (response.ok) {
        setWorkflows(workflows.map(w => 
          w.id === workflowId ? { ...w, is_active } : w
        ));
      }
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setWorkflows(workflows.filter(w => w.id !== workflowId));
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  const triggerWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/trigger`, {
        method: 'POST',
      });
      
      if (response.ok) {
        alert('Workflow triggered successfully');
      }
    } catch (error) {
      console.error('Error triggering workflow:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg bg-background p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Workflow className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">Workflow Automation</h3>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
      </div>

      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {workflows.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Workflow className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No workflows configured</p>
            <p className="text-sm mt-1">Create automated CI/CD pipelines</p>
          </div>
        ) : (
          workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium">{workflow.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {workflow.description}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleWorkflow(workflow.id, !workflow.is_active)}
                  >
                    {workflow.is_active ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => triggerWorkflow(workflow.id)}
                    disabled={!workflow.is_active}
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteWorkflow(workflow.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  <span>{workflow.triggers.length} triggers</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>{workflow.actions.length} actions</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(workflow.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {workflow.triggers.map((trigger, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                  >
                    {trigger.type}
                  </span>
                ))}
                {workflow.actions.map((action, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs"
                  >
                    {action.type}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateDialog && (
        <CreateWorkflowDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={fetchWorkflows}
        />
      )}
    </div>
  );
}

function CreateWorkflowDialog({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggers, setTriggers] = useState<WorkflowTrigger[]>([{ type: 'push', config: {} }]);
  const [actions, setActions] = useState<WorkflowAction[]>([{ type: 'test', config: {} }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, triggers, actions }),
      });
      
      if (response.ok) {
        onCreate();
        onClose();
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-4">Create Workflow</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
