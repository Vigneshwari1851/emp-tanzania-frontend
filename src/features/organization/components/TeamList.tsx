import React from 'react';
import { Eye, Pencil, Users } from 'lucide-react';

export interface Team {
  id: string | number;
  name: string;
  description: string;
  lead: string;
}

interface TeamListProps {
  teams: Team[];
  onViewTeam: (teamId: string | number) => void;
  onEditTeam: (teamId: string | number) => void;
}

/**
 * TeamList Component
 * 
 * A premium, responsive list component for displaying organizational teams.
 * Features a smooth action overlay on hover without layout shifting.
 */
const TeamList: React.FC<TeamListProps> = ({ teams, onViewTeam, onEditTeam }) => {
  return (
    <div className="w-full bg-card rounded-sm border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-6 py-4 text-sm leading-4 font-semibold text-black">Team Name</th>
              <th className="px-6 py-4 text-sm leading-4 font-semibold text-black">Description</th>
              <th className="px-6 py-4 text-sm leading-4 font-semibold text-black">Team Lead</th>
              <th className="px-6 py-4 text-right w-24 font-semibold text-sm text-black"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teams.length > 0 ? (
              teams.map((team) => (
                <tr
                  key={team.id}
                  className="group hover:bg-primary/10/30 transition-all duration-200 cursor-default"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-sm bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-semibold text-foreground">{team.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[14px] leading-5 text-gray-600 line-clamp-1 max-w-md">
                      {team.description || "No description provided"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-[14px] leading-5 text-foreground font-medium">
                    {team.lead}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    {/* Action Container - Absolute positioning ensures no layout shift */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end gap-2 transition-opacity duration-200 pr-2">
                      <button
                        onClick={() => onViewTeam(team.id)}
                        className="p-1.5 text-primary hover:bg-card hover:shadow-sm rounded-sm border border-transparent hover:border-primary-100 transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditTeam(team.id)}
                        className="p-1.5 text-gray-600 hover:bg-card hover:shadow-sm rounded-sm border border-transparent hover:border-border transition-all"
                        title="Edit Team"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                  No teams found. Add your first team to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Example Usage ---
/*
import TeamList, { Team } from './components/TeamList';

const MyPage = () => {
  const sampleTeams: Team[] = [
    { 
      id: 1, 
      name: "Engineering Core", 
      description: "Handles primary backend infrastructure and API services.", 
      lead: "Alex Rivera" 
    },
    { 
      id: 2, 
      name: "Frontend UI/UX", 
      description: "Focuses on design systems and customer-facing interfaces.", 
      lead: "Sarah Chen" 
    },
    { 
      id: 3, 
      name: "Product Growth", 
      description: "Data-driven team optimized for user acquisition metrics.", 
      lead: "Marcus Thorne" 
    }
  ];

  const handleView = (id: string | number) => console.log("Viewing team:", id);
  const handleEdit = (id: string | number) => console.log("Editing team:", id);

  return (
    <div className="p-8 bg-muted min-h-screen">
      <h2 className="text-[18px] font-bold mb-4">Teams Management</h2>
      <TeamList 
        teams={sampleTeams} 
        onViewTeam={handleView} 
        onEditTeam={handleEdit} 
      />
    </div>
  );
};
*/

export default TeamList;
