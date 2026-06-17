-- One pot, one buy-in (decided 2026-06-17).
--
-- The whole game is a single buy-in per player into ONE pot, paid to the
-- players still standing at the end (all-out in a round → split equally). The
-- pot is carried on the global pool; the 12 group pools are pick-tracking only
-- and contribute nothing to the pot.
--
-- The pools.buy_in CHECK requires buy_in > 0, so group pools keep a nominal
-- value but the app never reads their pot — getGamePot() reads only the global
-- pool's pot (buy_in × players). This migration just sets the single buy-in.

update public.pools set buy_in = 25 where group_key is null;
