#[test_only]
module predictai::agent_mandate_tests;

use predictai::agent_mandate::{Self, AgentMandate, KillCap};
use sui::clock;
use sui::object;
use sui::test_scenario;

const OWNER: address = @0xA11CE;
const AGENT: address = @0xB0B;

#[test]
fun matching_cap_kills_mandate() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clock = clock::create_for_testing(scenario.ctx());

    agent_mandate::create_mandate(AGENT, 500_000_000, 100_000, &clock, scenario.ctx());
    scenario.next_tx(OWNER);

    let mut mandate = scenario.take_shared<AgentMandate>();
    let cap = scenario.take_from_sender<KillCap>();
    agent_mandate::kill_mandate(&mut mandate, &cap, scenario.ctx());

    assert!(!agent_mandate::is_active(&mandate));
    test_scenario::return_shared(mandate);
    test_scenario::return_to_sender(&scenario, cap);
    clock::destroy_for_testing(clock);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = 5, location = predictai::agent_mandate)]
fun mismatched_cap_is_rejected() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut clock = clock::create_for_testing(scenario.ctx());

    agent_mandate::create_mandate(AGENT, 500_000_000, 100_000, &clock, scenario.ctx());
    agent_mandate::create_mandate(AGENT, 500_000_000, 100_000, &clock, scenario.ctx());
    scenario.next_tx(OWNER);

    let mut mandate_a = scenario.take_shared<AgentMandate>();
    let mandate_b = scenario.take_shared<AgentMandate>();
    let cap_a = scenario.take_from_sender<KillCap>();
    let cap_b = scenario.take_from_sender<KillCap>();

    let mandate_a_id = object::id_address(&mandate_a);
    let cap_a_matches = agent_mandate::kill_cap_mandate_id(&cap_a) == mandate_a_id;

    if (cap_a_matches) {
        agent_mandate::kill_mandate(&mut mandate_a, &cap_b, scenario.ctx());
    } else {
        agent_mandate::kill_mandate(&mut mandate_a, &cap_a, scenario.ctx());
    };

    test_scenario::return_shared(mandate_a);
    test_scenario::return_shared(mandate_b);
    test_scenario::return_to_sender(&scenario, cap_a);
    test_scenario::return_to_sender(&scenario, cap_b);
    clock::destroy_for_testing(clock);
    scenario.end();
}
