  // ═══════════════════════════════════════
  //  DATA
  // ═══════════════════════════════════════

  const VOLUME_TABLES = {
    novice: {
      hypertrophy: { chest:[6,10,14], back_lat:[8,12,18], back_upper:[8,12,16], shoulders:[6,10,16], quads:[6,12,18], hamstrings:[6,10,14], glutes:[6,10,14], biceps:[4,8,12], triceps:[4,8,12], calves:[4,8,12], abs:[4,8,12], traps:[4,8,10], forearms:[4,6,10] },
      strength: { chest:[4,7,12], back_lat:[5,9,14], back_upper:[5,9,12], shoulders:[4,7,12], quads:[5,9,14], hamstrings:[4,7,12], glutes:[4,7,12], biceps:[3,5,9], triceps:[3,5,9], calves:[3,5,9], abs:[3,5,9], traps:[3,5,8], forearms:[3,4,8] },
      both: { chest:[5,9,14], back_lat:[7,11,16], back_upper:[7,11,14], shoulders:[5,9,14], quads:[6,10,16], hamstrings:[5,9,14], glutes:[5,9,14], biceps:[3,7,11], triceps:[3,7,11], calves:[3,7,11], abs:[3,7,11], traps:[3,6,10], forearms:[3,5,9] }
    },
    intermediate: {
      hypertrophy: { chest:[8,14,20], back_lat:[10,16,22], back_upper:[10,15,20], shoulders:[8,14,20], quads:[8,14,22], hamstrings:[8,12,18], glutes:[8,12,18], biceps:[6,12,16], triceps:[6,12,16], calves:[6,10,16], abs:[6,10,16], traps:[6,10,14], forearms:[6,8,14] },
      strength: { chest:[5,10,16], back_lat:[7,12,18], back_upper:[7,12,16], shoulders:[5,10,16], quads:[6,12,18], hamstrings:[5,10,16], glutes:[5,10,16], biceps:[4,8,13], triceps:[4,8,13], calves:[4,8,13], abs:[4,8,13], traps:[4,8,11], forearms:[4,6,11] },
      both: { chest:[7,12,18], back_lat:[9,14,20], back_upper:[9,13,18], shoulders:[7,12,18], quads:[7,13,20], hamstrings:[7,11,17], glutes:[7,11,17], biceps:[5,10,14], triceps:[5,10,14], calves:[5,9,14], abs:[5,9,14], traps:[5,9,12], forearms:[5,7,12] }
    },
    advanced: {
      hypertrophy: { chest:[10,16,22], back_lat:[12,18,26], back_upper:[12,18,24], shoulders:[10,16,24], quads:[10,16,24], hamstrings:[10,14,22], glutes:[10,14,22], biceps:[8,14,20], triceps:[8,14,20], calves:[8,12,18], abs:[8,12,18], traps:[8,12,16], forearms:[8,10,16] },
      strength: { chest:[6,12,18], back_lat:[8,14,20], back_upper:[8,14,18], shoulders:[6,12,18], quads:[7,14,20], hamstrings:[6,12,18], glutes:[6,12,18], biceps:[5,10,15], triceps:[5,10,15], calves:[5,9,15], abs:[5,9,15], traps:[5,9,13], forearms:[5,7,13] },
      both: { chest:[8,14,20], back_lat:[10,16,22], back_upper:[10,16,20], shoulders:[8,14,20], quads:[9,15,22], hamstrings:[8,13,20], glutes:[8,13,20], biceps:[7,12,18], triceps:[7,12,18], calves:[7,11,17], abs:[7,11,17], traps:[7,11,15], forearms:[7,9,15] }
    }
  };

  const MUSCLES = [
    {id:'chest',name:'Chest',vid:'chest'},{id:'back',name:'Back (Lats)',vid:'back_lat'},
    {id:'shoulders',name:'Shoulders',vid:'shoulders'},{id:'quads',name:'Quads',vid:'quads'},
    {id:'hamstrings',name:'Hamstrings',vid:'hamstrings'},{id:'glutes',name:'Glutes',vid:'glutes'},
    {id:'biceps',name:'Biceps',vid:'biceps'},{id:'triceps',name:'Triceps',vid:'triceps'},
    {id:'calves',name:'Calves',vid:'calves'},{id:'abs',name:'Abs',vid:'abs'},
    {id:'traps',name:'Traps',vid:'traps'},{id:'forearms',name:'Forearms',vid:'forearms'}
  ];
  const VMAP = {}; MUSCLES.forEach(m=>VMAP[m.id]=m.vid);
  const TRIAL_DAYS = 7;
  const EVENTS_MAX = 500;

