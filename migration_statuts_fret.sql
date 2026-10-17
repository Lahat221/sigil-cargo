-- Suivi de colis Dakar -> France : trois étapes de plus entre « Expédiée » et
-- « Livrée » (transit à Paris, arrivée à Paris, arrivée dans la ville de
-- destination : Lyon, Marseille...). Les valeurs sont insérées avant 'livree'
-- pour que l'ordre de l'enum reste celui du parcours. Aucun colis existant
-- n'est modifié. À exécuter sur la base SIGIL uniquement (M.N garde ses 6
-- statuts).
alter type statut_commande add value if not exists 'en_transit_paris' before 'livree';
alter type statut_commande add value if not exists 'arrive_paris' before 'livree';
alter type statut_commande add value if not exists 'arrive_destination' before 'livree';
