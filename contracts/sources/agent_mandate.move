module predictai::agent_mandate {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::clock::{Self, Clock};


    // ── Errors ──
    const E_BUDGET_EXCEEDED: u64 = 1;
    const E_MANDATE_EXPIRED: u64 = 2;
    const E_MANDATE_KILLED: u64 = 3;
    const E_NOT_OWNER: u64 = 4;

    // ── Structs ──
    public struct AgentMandate has key, store {
        id: UID,
        owner: address,
        agent: address,
        budget_cap: u64,       // max dUSDC in MIST
        spent: u64,            // current spend
        expiry_ms: u64,        // unix timestamp ms
        is_active: bool,
        created_at: u64,
    }

    public struct KillCap has key {
        id: UID,
        mandate_id: address,
    }

    // ── Events ──
    public struct MandateCreated has copy, drop {
        mandate_id: address,
        owner: address,
        agent: address,
        budget_cap: u64,
        expiry_ms: u64,
    }

    public struct MandateKilled has copy, drop {
        mandate_id: address,
        killed_by: address,
        spent_total: u64,
    }

    public struct SpendRecorded has copy, drop {
        mandate_id: address,
        amount: u64,
        new_total: u64,
    }

    // ── Functions ──

    /// Create a new agent mandate with budget cap
    public entry fun create_mandate(
        agent: address,
        budget_cap: u64,
        expiry_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let owner = tx_context::sender(ctx);
        let mandate = AgentMandate {
            id: object::new(ctx),
            owner,
            agent,
            budget_cap,
            spent: 0,
            expiry_ms,
            is_active: true,
            created_at: clock::timestamp_ms(clock),
        };
        let mandate_id = object::id_address(&mandate);

        // Give owner a kill cap
        let kill_cap = KillCap {
            id: object::new(ctx),
            mandate_id,
        };

        sui::event::emit(MandateCreated {
            mandate_id,
            owner,
            agent,
            budget_cap,
            expiry_ms,
        });

        transfer::share_object(mandate);
        transfer::transfer(kill_cap, owner);
    }

    /// Agent calls this before every predict::mint
    /// Returns true if spend is allowed
    public fun check_and_record_spend(
        mandate: &mut AgentMandate,
        amount: u64,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        // Must be active
        assert!(mandate.is_active, E_MANDATE_KILLED);
        // Must not be expired
        assert!(
            clock::timestamp_ms(clock) < mandate.expiry_ms,
            E_MANDATE_EXPIRED
        );
        // Must be the authorized agent
        assert!(
            tx_context::sender(ctx) == mandate.agent,
            E_NOT_OWNER
        );
        // Must be within budget
        assert!(mandate.budget_cap - mandate.spent >= amount, E_BUDGET_EXCEEDED);
        let new_spent = mandate.spent + amount;

        mandate.spent = new_spent;

        sui::event::emit(SpendRecorded {
            mandate_id: object::id_address(mandate),
            amount,
            new_total: new_spent,
        });
    }

    /// Owner kills the agent immediately
    public entry fun kill_mandate(
        mandate: &mut AgentMandate,
        _kill_cap: &KillCap,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == mandate.owner, E_NOT_OWNER);
        mandate.is_active = false;

        sui::event::emit(MandateKilled {
            mandate_id: object::id_address(mandate),
            killed_by: mandate.owner,
            spent_total: mandate.spent,
        });
    }

    // ── Getters ──
    public fun is_active(mandate: &AgentMandate): bool { mandate.is_active }
    public fun budget_remaining(mandate: &AgentMandate): u64 { mandate.budget_cap - mandate.spent }
    public fun spent(mandate: &AgentMandate): u64 { mandate.spent }
    public fun owner(mandate: &AgentMandate): address { mandate.owner }
}
